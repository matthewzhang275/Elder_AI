import cv2
import numpy as np
from typing import Union, List, Dict, Tuple, Optional
from pathlib import Path

try:
    from deepface import DeepFace  # type: ignore
    DEEPFACE_AVAILABLE = True
except ImportError:
    DEEPFACE_AVAILABLE = False
    raise ImportError(
        "DeepFace library is not installed. Install it using: pip install deepface\n"
        "Note: This may also require tensorflow or other backends."
    )  # type: ignore


class PersonRecognizer:
    """
    A class that takes in an image/video and creates bounding boxes with person names.
    
    This class uses DeepFace library to detect and recognize faces,
    then draws bounding boxes with names on the detected faces.
    """
    
    def __init__(self, threshold: float = 0.6, model_name: str = "VGG-Face"):
        """
        Initialize the PersonRecognizer.
        
        Args:
            threshold: Distance threshold for face recognition (lower is more strict)
            model_name: DeepFace model to use (e.g., "VGG-Face", "Facenet", "OpenFace")
        """
        self.threshold = threshold
        self.model_name = model_name
        self.known_face_encodings: List[np.ndarray] = []
        self.known_face_names: List[str] = []
        # Store multiple encodings per person for better accuracy
        self.person_encodings: Dict[str, List[np.ndarray]] = {}
    
    def register_person(self, image: Union[str, np.ndarray], name: str) -> bool:
        """
        Register a person's face to be recognized later.
        For better accuracy, register multiple images of the same person.
        
        Args:
            image: Path to image file or numpy array (BGR format from OpenCV)
            name: Name of the person to associate with this face
        
        Returns:
            True if face was found and registered, False otherwise
        """
        # Load and convert image
        if isinstance(image, str):
            img = cv2.imread(image)
            if img is None:
                raise ValueError(f"Could not load image from {image}")
        else:
            img = image.copy()
        
        # Convert BGR to RGB for DeepFace
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        try:
            # Get face embedding using DeepFace
            embedding_obj = DeepFace.represent(
                img_path=rgb_img,
                model_name=self.model_name,
                enforce_detection=False
            )
            
            if not embedding_obj or len(embedding_obj) == 0:
                return False
            
            # Get the first face embedding
            embedding = np.array(embedding_obj[0]['embedding'])
            
            # Store in person-specific dictionary (for multiple images per person)
            if name not in self.person_encodings:
                self.person_encodings[name] = []
            self.person_encodings[name].append(embedding)
            
            # Also add to legacy list for backward compatibility
            self.known_face_encodings.append(embedding)
            self.known_face_names.append(name)
            
            return True
        except Exception as e:
            print(f"Error registering person {name}: {e}")
            return False
    
    def register_person_multiple(self, images: List[Union[str, np.ndarray]], name: str) -> Dict[str, int]:
        """
        Register a person using multiple images (e.g., different angles, expressions).
        This improves accuracy by learning multiple views of the same person.
        
        Args:
            images: List of image paths or numpy arrays
            name: Name of the person
        
        Returns:
            Dictionary with 'success' and 'failed' counts
        """
        results = {'success': 0, 'failed': 0}
        
        print(f"Registering {name} with {len(images)} images...")
        for i, image in enumerate(images, 1):
            print(f"  Processing image {i}/{len(images)}...", end=' ')
            success = self.register_person(image, name)
            if success:
                results['success'] += 1
                print("OK")
            else:
                results['failed'] += 1
                print("FAILED (no face detected)")
        
        print(f"  Result: {results['success']} successful, {results['failed']} failed")
        return results
    
    def register_person_from_video(self, video_path: str, name: str, frame_interval: int = 30, max_frames: Optional[int] = None) -> Dict[str, int]:
        """
        Register a person using frames from a video file.
        Samples frames from the video to capture different angles and expressions.
        This improves accuracy by learning multiple views of the same person.
        
        Args:
            video_path: Path to video file
            name: Name of the person
            frame_interval: Process every Nth frame (default: 30, meaning ~1 frame per second for 30fps video)
            max_frames: Maximum number of frames to process (None = no limit)
        
        Returns:
            Dictionary with 'success' and 'failed' counts
        """
        video_capture = cv2.VideoCapture(video_path)
        
        if not video_capture.isOpened():
            raise ValueError(f"Could not open video file: {video_path}")
        
        results = {'success': 0, 'failed': 0}
        frame_count = 0
        processed_count = 0
        
        try:
            print(f"Registering {name} from video: {video_path}")
            print(f"  Frame interval: {frame_interval}, Max frames: {max_frames or 'unlimited'}")
            
            while True:
                ret, frame = video_capture.read()
                
                if not ret:
                    break
                
                frame_count += 1
                
                # Process frames at the specified interval
                if frame_count % frame_interval == 0:
                    if max_frames is not None and processed_count >= max_frames:
                        break
                    
                    processed_count += 1
                    print(f"  Processing frame {frame_count} ({processed_count} processed)...", end=' ')
                    
                    success = self.register_person(frame, name)
                    if success:
                        results['success'] += 1
                        print("OK")
                    else:
                        results['failed'] += 1
                        print("FAILED (no face detected)")
            
            print(f"  Result: {results['success']} successful, {results['failed']} failed out of {processed_count} processed frames")
            
        finally:
            video_capture.release()
        
        return results
    
    def _find_faces_and_recognize(self, img: np.ndarray) -> List[Tuple[int, int, int, int, str]]:
        """
        Find faces in image and recognize them.
        Uses multiple encodings per person for better accuracy.
        
        Returns:
            List of tuples: (x, y, width, height, name)
        """
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        results = []
        
        try:
            # Use DeepFace.represent to get all faces with their locations and embeddings
            embedding_obj = DeepFace.represent(
                img_path=rgb_img,
                model_name=self.model_name,
                enforce_detection=False
            )
            
            if not embedding_obj or len(embedding_obj) == 0:
                return results
            
            # For each face found, extract location and compare embedding
            for face_data in embedding_obj:
                try:
                    # Get face region coordinates
                    face_region = face_data.get('facial_area', {})
                    x = face_region.get('x', 0)
                    y = face_region.get('y', 0)
                    w = face_region.get('w', 0)
                    h = face_region.get('h', 0)
                    
                    # Get embedding
                    current_embedding = np.array(face_data['embedding'])
                    name = "Unknown"
                    min_distance = float('inf')
                    
                    # Compare with known faces - use best match from all encodings
                    if len(self.person_encodings) > 0:
                        for person_name, encodings_list in self.person_encodings.items():
                            # Calculate distance to all encodings for this person
                            distances = [np.linalg.norm(current_embedding - enc) 
                                       for enc in encodings_list]
                            person_min_distance = min(distances)
                            
                            # Use the best match (lowest distance) across all persons
                            if person_min_distance < min_distance:
                                min_distance = person_min_distance
                                if min_distance < self.threshold:
                                    name = person_name
                    
                    # Fallback to legacy single-encoding comparison if person_encodings is empty
                    elif len(self.known_face_encodings) > 0:
                        distances = []
                        for known_embedding in self.known_face_encodings:
                            distance = np.linalg.norm(current_embedding - known_embedding)
                            distances.append(distance)
                        
                        min_distance = min(distances)
                        if min_distance < self.threshold:
                            best_match_index = distances.index(min_distance)
                            name = self.known_face_names[best_match_index]
                    
                    # Only add if we have valid coordinates
                    if w > 0 and h > 0:
                        results.append((x, y, w, h, name))
                    
                except Exception as e:
                    print(f"Error processing face: {e}")
                    continue
        
        except Exception as e:
            print(f"Error in face detection: {e}")
            pass
        
        return results
    
    def process_image(self, image: Union[str, np.ndarray], output_path: Optional[str] = None) -> np.ndarray:
        """
        Process an image to detect and label faces with names.
        
        Args:
            image: Path to image file or numpy array (BGR format)
            output_path: Optional path to save the processed image
        
        Returns:
            Processed image with bounding boxes and labels (BGR format)
        """
        # Load image
        if isinstance(image, str):
            img = cv2.imread(image)
            if img is None:
                raise ValueError(f"Could not load image from {image}")
        else:
            img = image.copy()
        
        # Find faces and recognize them
        faces = self._find_faces_and_recognize(img)
        
        # Draw bounding boxes and labels
        for x, y, w, h, name in faces:
            # Draw bounding box
            color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
            cv2.rectangle(img, (x, y), (x + w, y + h), color, 2)
            
            # Draw label background
            label_height = 30
            cv2.rectangle(img, (x, y - label_height), (x + w, y), color, cv2.FILLED)
            
            # Draw label text
            font = cv2.FONT_HERSHEY_DUPLEX
            font_scale = 0.6
            thickness = 1
            (text_width, text_height), baseline = cv2.getTextSize(name, font, font_scale, thickness)
            
            # Center text in label box
            text_x = x + (w - text_width) // 2
            text_y = y - label_height // 2 + text_height // 2
            
            cv2.putText(img, name, (text_x, text_y), font, font_scale, (255, 255, 255), thickness)
        
        # Save if output path provided
        if output_path:
            cv2.imwrite(output_path, img)
        
        return img
    
    def process_video(self, 
                     video_input: Union[str, int], 
                     output_path: Optional[str] = None,
                     show_preview: bool = True) -> None:
        """
        Process a video file or webcam stream to detect and label faces.
        
        Args:
            video_input: Path to video file or camera index (0 for default webcam)
            output_path: Optional path to save the processed video
            show_preview: Whether to display the video in a window (default: True)
        """
        # Open video
        if isinstance(video_input, int):
            video_capture = cv2.VideoCapture(video_input)
        else:
            video_capture = cv2.VideoCapture(video_input)
        
        if not video_capture.isOpened():
            raise ValueError(f"Could not open video source: {video_input}")
        
        # Get video properties
        fps = int(video_capture.get(cv2.CAP_PROP_FPS)) or 30
        width = int(video_capture.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(video_capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # Setup video writer if output path provided
        video_writer = None
        if output_path:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            video_writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        frame_count = 0
        faces = []  # Store faces from last processed frame
        
        try:
            while True:
                ret, frame = video_capture.read()
                
                if not ret:
                    break
                
                frame_count += 1
                
                # Process every 5th frame to speed up processing (or first frame)
                if frame_count % 5 == 0 or frame_count == 1:
                    faces = self._find_faces_and_recognize(frame)
                
                # Draw bounding boxes and labels
                for x, y, w, h, name in faces:
                    # Draw bounding box
                    color = (0, 255, 0) if name != "Unknown" else (0, 0, 255)
                    cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
                    
                    # Draw label background
                    label_height = 30
                    cv2.rectangle(frame, (x, y - label_height), (x + w, y), color, cv2.FILLED)
                    
                    # Draw label text
                    font = cv2.FONT_HERSHEY_DUPLEX
                    font_scale = 0.6
                    thickness = 1
                    (text_width, text_height), baseline = cv2.getTextSize(name, font, font_scale, thickness)
                    
                    # Center text in label box
                    text_x = x + (w - text_width) // 2
                    text_y = y - label_height // 2 + text_height // 2
                    
                    cv2.putText(frame, name, (text_x, text_y), font, font_scale, (255, 255, 255), thickness)
                
                # Write frame to output video
                if video_writer:
                    video_writer.write(frame)
                
                # Display the resulting frame
                if show_preview:
                    cv2.imshow('Person Recognition', frame)
                    
                    # Press 'q' to quit
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        break
        
        finally:
            # Clean up
            video_capture.release()
            if video_writer:
                video_writer.release()
            if show_preview:
                cv2.destroyAllWindows()
    
    def get_recognized_persons(self) -> List[str]:
        """
        Get list of all registered person names.
        
        Returns:
            List of registered person names
        """
        # Return names from person_encodings dict (more accurate)
        if self.person_encodings:
            return list(self.person_encodings.keys())
        # Fallback to legacy list
        return list(set(self.known_face_names))
    
    def clear_registered_persons(self) -> None:
        """Clear all registered persons."""
        self.known_face_encodings.clear()
        self.known_face_names.clear()
        self.person_encodings.clear()


# Example usage
if __name__ == "__main__":
    # Initialize recognizer
    recognizer = PersonRecognizer(threshold=0.6, model_name="VGG-Face")
    
    # Example: Register a person with multiple images (better accuracy)
    # recognizer.register_person_multiple(["angle1.jpg", "angle2.jpg", "angle3.jpg"], "John Doe")
    
    # Example: Register a person from video (samples frames from video)
    # recognizer.register_person_from_video("path/to/person_video.mp4", "John Doe")
    
    # Example: Register a person (single image)
    # recognizer.register_person("path/to/person_image.jpg", "John Doe")
    
    # Example: Process an image
    # result_image = recognizer.process_image("path/to/test_image.jpg", "output.jpg")
    
    # Example: Process a video
    # recognizer.process_video("path/to/video.mp4", "output_video.mp4")
    
    # Example: Process webcam
    # recognizer.process_video(0)  # 0 for default webcam
    
    print("PersonRecognizer class ready to use!")
    print("Register persons using register_person() method")
    print("For better accuracy, use register_person_multiple() with multiple images")
    print("Or use register_person_from_video() to register from video files")
    print("Process images using process_image() method")
    print("Process videos using process_video() method")
