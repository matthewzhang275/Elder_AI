"""
Interactive terminal menu for PersonRecognizer
Allows you to choose between Photo, Video, or Webcam processing
"""

from scan import PersonRecognizer
import cv2
import sys
import os

def print_menu():
    """Print the main menu"""
    print("\n" + "=" * 60)
    print("PersonRecognizer - Face Detection & Recognition")
    print("=" * 60)
    print("\nOptions:")
    print("1. Process a Photo/Image")
    print("2. Process a Video File")
    print("3. Process Webcam (Live)")
    print("4. Register a Person")
    print("5. View Registered Persons")
    print("6. Clear All Registered Persons")
    print("7. Exit")
    print("=" * 60)

def check_registered_persons(recognizer) -> bool:
    """Check if there are any registered persons"""
    persons = recognizer.get_recognized_persons()
    return len(persons) > 0

def process_photo(recognizer):
    """Process a photo/image"""
    print("\n[PHOTO MODE]")
    print("-" * 60)
    
    # Check if persons are registered
    if not check_registered_persons(recognizer):
        print("Error: No persons registered yet!")
        print("Please register at least one person first using option 4.")
        input("\nPress Enter to go back to menu...")
        return
    
    image_path = input("Enter image file path (or 'back' to return to menu): ").strip().strip('"')
    if image_path.lower() == 'back':
        return
    if not image_path or not os.path.exists(image_path):
        print("Error: Image file not found!")
        input("\nPress Enter to go back to menu...")
        return
    
    output_path = input("Enter output file path (or press Enter for 'output.jpg'): ").strip().strip('"')
    if not output_path:
        output_path = "output.jpg"
    
    try:
        print("\nProcessing image... (this may take a few seconds)")
        result_image = recognizer.process_image(image_path, output_path)
        print(f"[OK] Processed image saved to: {output_path}")
        
        print("\nDisplaying result (press any key to close)...")
        cv2.imshow("Processed Image", result_image)
        cv2.waitKey(0)
        cv2.destroyAllWindows()
        
        print("[OK] Done!")
        input("\nPress Enter to continue...")
        
    except Exception as e:
        print(f"[ERROR] Error processing image: {e}")
        import traceback
        traceback.print_exc()
        input("\nPress Enter to continue...")

def process_video(recognizer):
    """Process a video file"""
    print("\n[VIDEO MODE]")
    print("-" * 60)
    
    # Check if persons are registered
    if not check_registered_persons(recognizer):
        print("Error: No persons registered yet!")
        print("Please register at least one person first using option 4.")
        input("\nPress Enter to go back to menu...")
        return
    
    video_path = input("Enter video file path (or 'back' to return to menu): ").strip().strip('"')
    if video_path.lower() == 'back':
        return
    if not video_path or not os.path.exists(video_path):
        print("Error: Video file not found!")
        input("\nPress Enter to go back to menu...")
        return
    
    output_path = input("Enter output video path (or press Enter for 'output_video.mp4'): ").strip().strip('"')
    if not output_path:
        output_path = "output_video.mp4"
    
    show_preview_input = input("Show preview while processing? (y/n, default=y): ").strip().lower()
    show_preview = show_preview_input != 'n'
    
    try:
        print("\nProcessing video... (this may take a while)")
        print("Press 'q' in the preview window to stop processing")
        recognizer.process_video(video_path, output_path, show_preview=show_preview)
        print(f"\n[OK] Processed video saved to: {output_path}")
        input("\nPress Enter to continue...")
        
    except Exception as e:
        print(f"[ERROR] Error processing video: {e}")
        import traceback
        traceback.print_exc()
        input("\nPress Enter to continue...")

def process_webcam(recognizer):
    """Process webcam stream"""
    print("\n[WEBCAM MODE]")
    print("-" * 60)
    
    # Check if persons are registered
    if not check_registered_persons(recognizer):
        print("Error: No persons registered yet!")
        print("Please register at least one person first using option 4.")
        input("\nPress Enter to go back to menu...")
        return
    
    print("Opening webcam...")
    print("Press 'q' in the camera window to quit")
    
    save_output = input("Save video to file? (y/n): ").strip().lower()
    output_path = None
    if save_output == 'y':
        output_path = input("Enter output video path (or press Enter for 'webcam_output.mp4'): ").strip().strip('"')
        if not output_path:
            output_path = "webcam_output.mp4"
    
    try:
        recognizer.process_video(0, output_path=output_path, show_preview=True)
        if output_path:
            print(f"\n[OK] Video saved to: {output_path}")
        print("[OK] Webcam session ended")
        input("\nPress Enter to continue...")
        
    except Exception as e:
        print(f"[ERROR] Error with webcam: {e}")
        print("(Make sure your webcam is connected and not being used by another program)")
        input("\nPress Enter to continue...")

def register_person_from_camera(recognizer, name: str = None):
    """Register a person by scanning with camera - auto-capture from video"""
    print("\n[REGISTER PERSON FROM CAMERA]")
    print("-" * 60)
    
    if name is None:
        name = input("Enter the person's name: ").strip()
        if not name:
            print("Error: Name cannot be empty!")
            return
    
    print("\nChoose capture mode:")
    print("1. Auto-scan (continuously captures from video - recommended for 360 scan)")
    print("2. Manual capture (press SPACE for each photo)")
    
    mode = input("Enter choice (1 or 2, default=1): ").strip() or "1"
    
    if mode == "1":
        # Auto-scan mode - continuously capture from video
        print("\n[AUTO-SCAN MODE]")
        print("Instructions:")
        print("1. Position yourself in front of the camera")
        print("2. Slowly rotate/move (360 degrees recommended)")
        print("3. System will auto-capture frames with faces")
        print("4. Press 'q' when done (will auto-stop after 20 seconds)")
        print("\nOpening camera...")
        
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            print("Error: Could not open camera!")
            return
        
        # Give camera a moment to initialize
        import time
        time.sleep(0.5)
        
        # Test frame read to ensure camera works
        ret, test_frame = cap.read()
        if not ret or test_frame is None:
            print("Error: Camera opened but cannot read frames!")
            cap.release()
            return
        
        captured_images = []
        frame_count = 0
        last_capture_frame = 0
        capture_interval = 5  # Capture every 5 frames (reduced from 10 for more photos)
        temp_dir = "temp_camera_captures"
        os.makedirs(temp_dir, exist_ok=True)
        
        scan_duration = 20  # 20 seconds for good balance of images and time
        
        print(f"\nStarting {scan_duration}-second scan...")
        print("Camera window will open - make sure it's visible!")
        print("(Press 'q' in the camera window to stop early)")
        
        start_time = time.time()
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret or frame is None:
                    print("Warning: Could not read frame from camera")
                    break
                
                frame_count += 1
                elapsed = time.time() - start_time
                
                # Check if time is up
                if elapsed >= scan_duration:
                    print(f"\nScan duration ({scan_duration}s) completed!")
                    break
                
                # Auto-capture every N frames (without face detection - faster)
                if frame_count - last_capture_frame >= capture_interval:
                    # Save the frame directly (face detection will happen during registration)
                    timestamp = int(time.time() * 1000)
                    image_path = os.path.join(temp_dir, f"{name}_{timestamp}.jpg")
                    cv2.imwrite(image_path, frame)
                    captured_images.append(image_path)
                    last_capture_frame = frame_count
                    print(f"  Auto-captured: {len(captured_images)} frames | Time: {elapsed:.1f}s")
                
                # Display info on frame
                time_left = max(0, scan_duration - elapsed)
                cv2.putText(frame, f"Auto-scanning... | Captured: {len(captured_images)} | Time left: {time_left:.1f}s", 
                           (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                cv2.putText(frame, f"Registering: {name} | Press 'q' to stop", (10, 60), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                
                # Show the frame - this creates the window
                cv2.imshow("Camera - Auto-Scan Registration", frame)
                
                # Wait for key press (1ms) - this is required for window to display
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    print("\nStopped by user")
                    break
        
        finally:
            cap.release()
            cv2.destroyAllWindows()
            print("Camera released")
    
    else:
        # Manual capture mode (original behavior)
        print("\n[MANUAL CAPTURE MODE]")
        print("Instructions:")
        print("1. Look at the camera")
        print("2. Press SPACE to capture a photo")
        print("3. Press 'q' when done (recommended: 10-20 photos from different angles for better accuracy)")
        print("4. Photos will be saved temporarily for registration")
        print("\nOpening camera...")
        
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            print("Error: Could not open camera!")
            return
        
        captured_images = []
        frame_count = 0
        temp_dir = "temp_camera_captures"
        os.makedirs(temp_dir, exist_ok=True)
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                frame_count += 1
                
                # Display instructions on frame
                cv2.putText(frame, f"Press SPACE to capture | 'q' to finish | Captured: {len(captured_images)}", 
                           (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                cv2.putText(frame, f"Registering: {name}", (10, 60), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                
                cv2.imshow("Camera - Register Person", frame)
                
                key = cv2.waitKey(1) & 0xFF
                
                if key == ord(' '):  # Spacebar to capture
                    # Save the frame
                    timestamp = frame_count
                    image_path = os.path.join(temp_dir, f"{name}_{timestamp}.jpg")
                    cv2.imwrite(image_path, frame)
                    captured_images.append(image_path)
                    print(f"  Captured photo {len(captured_images)}: {image_path}")
                    
                    # Flash effect
                    flash_frame = frame.copy()
                    flash_frame[:] = (255, 255, 255)
                    cv2.imshow("Camera - Register Person", flash_frame)
                    cv2.waitKey(100)
                
                elif key == ord('q'):  # Quit
                    break
        
        finally:
            cap.release()
            cv2.destroyAllWindows()
    
    if not captured_images:
        print("\nNo photos captured. Registration cancelled.")
        return
    
    print(f"\nCaptured {len(captured_images)} frames. Registering...")
    
    try:
        # Register with all captured images
        result = recognizer.register_person_multiple(captured_images, name)
        
        if result['success'] > 0:
            print(f"\n[OK] Successfully registered {name} with {result['success']} photos")
            
            # Ask if user wants to keep the photos
            keep = input("\nKeep captured photos? (y/n, default=n): ").strip().lower()
            if keep != 'y':
                # Clean up temp files
                for img_path in captured_images:
                    try:
                        os.remove(img_path)
                    except:
                        pass
                try:
                    os.rmdir(temp_dir)
                except:
                    pass
                print("Temporary photos deleted")
            else:
                print(f"Photos saved in: {temp_dir}/")
        else:
            print(f"\n[FAIL] Could not register {name} (no faces detected in photos)")
            # Clean up temp files
            for img_path in captured_images:
                try:
                    os.remove(img_path)
                except:
                    pass
    except Exception as e:
        print(f"[ERROR] Error registering person: {e}")
        import traceback
        traceback.print_exc()

def register_person(recognizer):
    """Register a new person"""
    print("\n[REGISTER PERSON]")
    print("-" * 60)
    print("Options:")
    print("1. Register with single image file")
    print("2. Register with multiple image files (better accuracy)")
    print("3. Register from directory (all images in folder)")
    print("4. Register using camera (take photos now)")
    print("(Enter 'back' at any prompt to return to main menu)")
    
    choice = input("\nEnter choice (1-4, or 'back'): ").strip().lower()
    
    if choice == 'back':
        return
    
    # Only ask for name if not using camera (camera mode will ask)
    if choice != "4":
        name = input("Enter the person's name (or 'back' to return): ").strip()
        if name.lower() == 'back':
            return
        if not name:
            print("Error: Name cannot be empty!")
            input("\nPress Enter to continue...")
            return
    
    try:
        if choice == "1":
            # Single image
            image_path = input("Enter image file path (or 'back'): ").strip().strip('"')
            if image_path.lower() == 'back':
                return
            if not image_path or not os.path.exists(image_path):
                print("Error: Image file not found!")
                input("\nPress Enter to continue...")
                return
            
            print("\nRegistering person... (this may take a few seconds)")
            success = recognizer.register_person(image_path, name)
            
            if success:
                print(f"[OK] Successfully registered: {name}")
            else:
                print(f"[FAIL] Could not register {name} (no face detected in image)")
                print("Make sure the image has a clear, front-facing face")
            input("\nPress Enter to continue...")
        
        elif choice == "2":
            # Multiple images
            print("\nEnter image file paths (press Enter after each, empty line to finish, 'back' to cancel):")
            image_paths = []
            while True:
                path = input(f"Image {len(image_paths) + 1}: ").strip().strip('"')
                if path.lower() == 'back':
                    return
                if not path:
                    break
                if os.path.exists(path):
                    image_paths.append(path)
                else:
                    print(f"  Warning: File not found: {path}")
            
            if not image_paths:
                print("Error: No valid images provided!")
                input("\nPress Enter to continue...")
                return
            
            print(f"\nRegistering {name} with {len(image_paths)} images...")
            result = recognizer.register_person_multiple(image_paths, name)
            if result['success'] > 0:
                print(f"[OK] Successfully registered {name} with {result['success']} images")
            else:
                print(f"[FAIL] Could not register {name} (no faces detected)")
            input("\nPress Enter to continue...")
        
        elif choice == "3":
            # Directory
            directory = input("Enter directory path containing images (or 'back'): ").strip().strip('"')
            if directory.lower() == 'back':
                return
            if not directory or not os.path.exists(directory):
                print("Error: Directory not found!")
                input("\nPress Enter to continue...")
                return
            
            print(f"\nRegistering {name} from directory...")
            result = recognizer.register_person_from_directory(directory, name)
            if result['success'] > 0:
                print(f"[OK] Successfully registered {name} with {result['success']} images")
            else:
                print(f"[FAIL] Could not register {name} (no faces detected)")
            input("\nPress Enter to continue...")
        
        elif choice == "4":
            # Camera - name will be asked inside the function
            register_person_from_camera(recognizer)
        else:
            print("Invalid choice!")
            input("\nPress Enter to continue...")
        
    except Exception as e:
        print(f"[ERROR] Error registering person: {e}")
        import traceback
        traceback.print_exc()
        input("\nPress Enter to continue...")

def view_registered(recognizer):
    """View registered persons"""
    print("\n[REGISTERED PERSONS]")
    print("-" * 60)
    
    persons = recognizer.get_recognized_persons()
    if persons:
        print(f"Registered persons ({len(persons)}):")
        for i, person in enumerate(persons, 1):
            print(f"  {i}. {person}")
    else:
        print("No persons registered yet.")
        print("Use option 4 to register persons first.")
    
    input("\nPress Enter to continue...")

def clear_registered(recognizer):
    """Clear all registered persons"""
    print("\n[CLEAR REGISTERED PERSONS]")
    print("-" * 60)
    
    persons = recognizer.get_recognized_persons()
    if not persons:
        print("No persons to clear.")
        input("\nPress Enter to continue...")
        return
    
    print(f"Currently registered: {', '.join(persons)}")
    confirm = input("Are you sure you want to clear all registered persons? (y/n): ").strip().lower()
    
    if confirm == 'y':
        recognizer.clear_registered_persons()
        print("[OK] All registered persons cleared")
    else:
        print("Cancelled")
    input("\nPress Enter to continue...")

def main():
    """Main menu loop"""
    print("\n" + "=" * 60)
    print("Initializing PersonRecognizer...")
    print("=" * 60)
    
    try:
        recognizer = PersonRecognizer(threshold=0.7, model_name="VGG-Face")
        print("[OK] PersonRecognizer initialized successfully")
    except Exception as e:
        print(f"[ERROR] Failed to initialize: {e}")
        input("Press Enter to exit...")
        return
    
    while True:
        try:
            print_menu()
            choice = input("\nEnter your choice (1-7): ").strip()
            
            if choice == "1":
                process_photo(recognizer)
            elif choice == "2":
                process_video(recognizer)
            elif choice == "3":
                process_webcam(recognizer)
            elif choice == "4":
                register_person(recognizer)
            elif choice == "5":
                view_registered(recognizer)
            elif choice == "6":
                clear_registered(recognizer)
            elif choice == "7":
                print("\nExiting... Goodbye!")
                break
            else:
                print("\n[ERROR] Invalid choice. Please enter 1-7.")
                input("Press Enter to continue...")
                
        except KeyboardInterrupt:
            print("\n\nInterrupted. Exiting...")
            break
        except EOFError:
            print("\n\nExiting...")
            break
        except Exception as e:
            print(f"\n[ERROR] Unexpected error: {e}")
            import traceback
            traceback.print_exc()
            input("Press Enter to continue...")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nExiting...")
    except Exception as e:
        print(f"\nFatal error: {e}")
        import traceback
        traceback.print_exc()
