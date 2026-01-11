# Improving Face Recognition Accuracy

## Key Strategies

### 1. **Multiple Images per Person (RECOMMENDED)**
Register each person with multiple images from different angles, expressions, and lighting conditions. This dramatically improves accuracy.

**Best Practice:**
- Use 5-20 images per person
- Include: front view, side views (left/right), different expressions, different lighting
- The more variety, the better the recognition

**Example:**
```python
# Register with multiple images
recognizer.register_person_multiple([
    "person_front.jpg",
    "person_left.jpg", 
    "person_right.jpg",
    "person_smiling.jpg",
    "person_indoor.jpg",
    "person_outdoor.jpg"
], "John Doe")
```

### 2. **Use Directory-Based Registration**
Organize images in folders and register all at once:

```
person_images/
  ├── john_doe/
  │   ├── front.jpg
  │   ├── left.jpg
  │   ├── right.jpg
  │   └── ...
  ├── jane_smith/
  │   ├── front.jpg
  │   └── ...
```

```python
recognizer.register_person_from_directory("person_images/john_doe/", "John Doe")
```

### 3. **Image Quality Guidelines**
- **Resolution**: Higher is better (minimum 200x200 pixels for face)
- **Lighting**: Even, natural lighting works best
- **Angle**: Include front-facing images (most important)
- **Expression**: Neutral expressions work best, but include variety
- **Background**: Plain backgrounds are easier, but not required
- **Clarity**: Sharp, in-focus images (avoid blurry photos)

### 4. **Adjust Threshold**
The threshold controls how strict the matching is:
- **Lower threshold (0.4-0.5)**: More strict, fewer false positives, but may miss some matches
- **Higher threshold (0.7-0.8)**: More lenient, catches more matches but may have false positives
- **Default (0.6)**: Good balance for most cases

```python
# More strict (fewer false positives)
recognizer = PersonRecognizer(threshold=0.5)

# More lenient (catches more matches)
recognizer = PersonRecognizer(threshold=0.7)
```

### 5. **Model Selection**
Different models have different strengths:
- **VGG-Face** (default): Good general performance
- **Facenet**: Often more accurate, but slower
- **OpenFace**: Faster, but may be less accurate

```python
recognizer = PersonRecognizer(model_name="Facenet")  # More accurate
```

### 6. **360-Degree Scan Strategy**
If you want to do a "360 scan" to register someone:

1. Take photos from multiple angles:
   - Front (0°)
   - Left profile (90°)
   - Right profile (270°)
   - Left 3/4 (45°)
   - Right 3/4 (315°)
   - Back (180°) - usually not useful for face recognition

2. Include different expressions:
   - Neutral
   - Smiling
   - Serious

3. Different lighting:
   - Indoor
   - Outdoor
   - Different times of day

4. Register all at once:
```python
images_360 = [
    "front.jpg",
    "left_90.jpg",
    "right_270.jpg", 
    "left_45.jpg",
    "right_315.jpg",
    "smiling.jpg",
    "indoor.jpg",
    "outdoor.jpg"
]
recognizer.register_person_multiple(images_360, "Person Name")
```

## Implementation in run.py

The updated `run.py` now supports:
- **Option 4.1**: Single image registration
- **Option 4.2**: Multiple images registration (better accuracy)
- **Option 4.3**: Directory-based registration (easiest for multiple images)

## Recommended Workflow

1. **Collection Phase**: Gather 5-20 images per person from different angles/conditions
2. **Organization**: Put each person's images in a separate folder
3. **Registration**: Use `register_person_from_directory()` for each person
4. **Testing**: Test with new images to verify accuracy
5. **Adjustment**: Fine-tune threshold if needed

## Expected Accuracy

- **Single image**: ~70-85% accuracy
- **3-5 images**: ~85-92% accuracy  
- **10+ images (multiple angles)**: ~92-97% accuracy
- **20+ images (full 360 + variations)**: ~95-98% accuracy
