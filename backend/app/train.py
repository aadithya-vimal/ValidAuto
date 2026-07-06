import os
import shutil
import numpy as np
from PIL import Image, ImageDraw

# Try importing standard tensorflow, fallback to local raw numpy emulator if not available (e.g., Python 3.14)
try:
    import tensorflow as tf
except ImportError:
    import tf_mock as tf

# Model Configurations
IMAGE_SIZE = (224, 224)
CLASSES = ['scratch', 'dent', 'none']
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'vehicle_damage_model.h5')

def create_synthetic_dataset(base_dir):
    """
    Generates dummy vehicle panel image splits (scratched, dented, clean)
    to facilitate self-contained model training demonstrations.
    """
    print("Generating synthetic vehicle panels dataset...")
    
    splits = ['train', 'val', 'test']
    counts = {'train': 45, 'val': 15, 'test': 15}
    
    for split in splits:
        for cls in CLASSES:
            path = os.path.join(base_dir, split, cls)
            os.makedirs(path, exist_ok=True)
            
            for i in range(counts[split]):
                # Create a base gray panel representing vehicle paint
                img = Image.new("RGB", IMAGE_SIZE, color=(140, 150, 160))
                draw = ImageDraw.Draw(img)
                
                if cls == 'scratch':
                    # Draw sharp dark/light intersecting lines to simulate key marks or scrapes
                    start_x = np.random.randint(20, 100)
                    start_y = np.random.randint(20, 100)
                    draw.line([start_x, start_y, start_x + 80, start_y + 80], fill=(50, 50, 50), width=3)
                    draw.line([start_x + 5, start_y, start_x + 85, start_y + 80], fill=(220, 220, 220), width=1)
                
                elif cls == 'dent':
                    # Draw dark circles with offset gradients to simulate impact denting
                    center = (np.random.randint(70, 150), np.random.randint(70, 150))
                    radius = np.random.randint(30, 60)
                    draw.ellipse([center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius], fill=(110, 120, 130))
                    draw.ellipse([center[0] - radius + 10, center[1] - radius + 10, center[0] + radius - 10, center[1] + radius - 10], fill=(90, 100, 110))
                
                # Save static file
                img.save(os.path.join(path, f"{cls}_{i}.jpg"))
                
    print(f"Synthetic dataset created successfully in '{base_dir}'")

def load_and_preprocess_data(base_dir, split):
    """
    Loads images from folder splits, resizes them, and normalizes pixel values.
    """
    x_data = []
    y_data = []
    
    for label_idx, cls in enumerate(CLASSES):
        folder_path = os.path.join(base_dir, split, cls)
        for filename in os.listdir(folder_path):
            file_path = os.path.join(folder_path, filename)
            
            # Load and Resize to (224, 224)
            img = tf.load_img(file_path, target_size=IMAGE_SIZE)
            img_arr = tf.img_to_array(img)
            
            # Preprocess / Normalize pixel entries to [0.0, 1.0] range
            img_arr = img_arr / 255.0
            
            x_data.append(img_arr)
            y_data.append(label_idx)
            
    return np.array(x_data, dtype=np.float32), np.array(y_data, dtype=np.float32)

def train_vehicle_damage_classifier():
    """
    Triggers full dataset collection, model creation with transfer learning base,
    compiles and runs SGD fit, tests accuracy, and saves outputs.
    """
    dataset_dir = os.path.join(os.path.dirname(__file__), 'temp_dataset')
    
    try:
        # 1. Create dataset
        create_synthetic_dataset(dataset_dir)
        
        # 2. Preprocess data
        print("Loading and preprocessing datasets...")
        x_train, y_train = load_and_preprocess_data(dataset_dir, 'train')
        x_val, y_val = load_and_preprocess_data(dataset_dir, 'val')
        x_test, y_test = load_and_preprocess_data(dataset_dir, 'test')
        
        print(f"Train features: {x_train.shape}, Labels: {y_train.shape}")
        print(f"Val features: {x_val.shape}, Labels: {y_val.shape}")
        print(f"Test features: {x_test.shape}, Labels: {y_test.shape}")
        
        # 3. Model construction mimicking transfer learning
        base_model = tf.MobileNetV2(input_shape=(224, 224, 3), include_top=False, weights='imagenet')
        
        model = tf.Sequential([
            base_model,
            tf.GlobalAveragePooling2D(),
            tf.Dropout(0.2),
            tf.Dense(128, activation='relu'),
            tf.Dense(len(CLASSES), activation='softmax')
        ])
        
        # 4. Compile parameters
        model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
        
        # 5. Fit model
        model.fit(
            x_train, 
            y_train, 
            validation_data=(x_val, y_val),
            epochs=5,
            batch_size=16
        )
        
        # 6. Evaluate model on unseen test set
        print("Evaluating model on test set...")
        test_predictions = model.predict(x_test)
        test_preds_labels = np.argmax(test_predictions, axis=1)
        test_accuracy = np.mean(test_preds_labels == y_test)
        print(f"Test Set Classification Accuracy: {test_accuracy * 100:.2f}%")
        
        # 7. Save model
        model.save(MODEL_PATH)
        print(f"Successfully trained and saved model weights to '{MODEL_PATH}'")
        
    finally:
        # Clean up temporary dataset folder
        if os.path.exists(dataset_dir):
            shutil.rmtree(dataset_dir)
            print("Cleaned up temporary dataset directory.")

if __name__ == '__main__':
    train_vehicle_damage_classifier()
