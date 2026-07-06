import os
import shutil
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance

# Try importing standard tensorflow, fallback to local raw numpy emulator if not available (e.g., Python 3.14)
try:
    import tensorflow as tf
except ImportError:
    try:
        import tf_mock as tf
    except ImportError:
        from app import tf_mock as tf

# Model Configurations
IMAGE_SIZE = (224, 224)
CLASSES = ['00-damage', '01-whole']
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'vehicle_damage_model.h5')
FRONTEND_PUBLIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'public'))

def augment_image(img_pil):
    """
    Applies data augmentation parameters (flips, rotations, brightness shifts)
    using PIL to help generalize the neural network parameters.
    """
    # 1. Random horizontal flip (50% chance)
    if np.random.rand() > 0.5:
        img_pil = img_pil.transpose(Image.FLIP_LEFT_RIGHT)
        
    # 2. Random rotation (-12 to +12 degrees)
    angle = np.random.uniform(-12, 12)
    img_pil = img_pil.rotate(angle, resample=Image.BICUBIC, expand=False, fillcolor=(140, 150, 160))
    
    # 3. Random brightness adjustment (90% to 110%)
    enhancer = ImageEnhance.Brightness(img_pil)
    brightness_factor = np.random.uniform(0.9, 1.1)
    img_pil = enhancer.enhance(brightness_factor)
    
    return img_pil

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
                    start_x = np.random.randint(20, 100)
                    start_y = np.random.randint(20, 100)
                    draw.line([start_x, start_y, start_x + 80, start_y + 80], fill=(50, 50, 50), width=3)
                    draw.line([start_x + 5, start_y, start_x + 85, start_y + 80], fill=(220, 220, 220), width=1)
                
                elif cls == 'dent':
                    center = (np.random.randint(70, 150), np.random.randint(70, 150))
                    radius = np.random.randint(30, 60)
                    draw.ellipse([center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius], fill=(110, 120, 130))
                    draw.ellipse([center[0] - radius + 10, center[1] - radius + 10, center[0] + radius - 10, center[1] + radius - 10], fill=(90, 100, 110))
                
                # Save primary image
                img.save(os.path.join(path, f"{cls}_{i}.jpg"))
                
                # Data Augmentation: For training split, generate and save augmented copies
                if split == 'train':
                    augmented_img = augment_image(img)
                    augmented_img.save(os.path.join(path, f"{cls}_{i}_aug.jpg"))
                
    print(f"Synthetic dataset created successfully in '{base_dir}'")

def load_and_preprocess_data(base_dir, split):
    """
    Loads images from folder splits, resizes them, and normalizes pixel values.
    """
    x_data = []
    y_data = []
    
    for label_idx, cls in enumerate(CLASSES):
        folder_path = os.path.join(base_dir, split, cls)
        if not os.path.exists(folder_path):
            print(f"[Warning] Class folder not found: {folder_path}")
            continue
        for filename in os.listdir(folder_path):
            file_path = os.path.join(folder_path, filename)
            if not os.path.isfile(file_path):
                continue
            
            try:
                # Load and Resize to (224, 224)
                img = tf.load_img(file_path, target_size=IMAGE_SIZE)
                img_arr = tf.img_to_array(img)
                
                # Preprocess / Normalize pixel entries to [0.0, 1.0] range
                img_arr = img_arr / 255.0
                
                x_data.append(img_arr)
                y_data.append(label_idx)
            except Exception as e:
                print(f"[Warning] Failed to load image {file_path}: {e}")
                continue
            
    return np.array(x_data, dtype=np.float32), np.array(y_data, dtype=np.float32)

def calculate_metrics(y_true, y_pred_probs):
    """
    Computes classification evaluation metrics: Accuracy, Precision, Recall, F1-Score,
    and a standard Confusion Matrix.
    """
    y_pred = np.argmax(y_pred_probs, axis=1)
    num_classes = len(CLASSES)
    
    # 1. Confusion Matrix
    cm = np.zeros((num_classes, num_classes), dtype=int)
    for t, p in zip(y_true.astype(int), y_pred.astype(int)):
        cm[t, p] += 1
        
    # 2. Precision, Recall, F1 per class
    precision_list = []
    recall_list = []
    f1_list = []
    
    for i in range(num_classes):
        tp = cm[i, i]
        fp = np.sum(cm[:, i]) - tp
        fn = np.sum(cm[i, :]) - tp
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
        
        precision_list.append(precision)
        recall_list.append(recall)
        f1_list.append(f1)
        
    accuracy = np.mean(y_true == y_pred)
    avg_precision = np.mean(precision_list)
    avg_recall = np.mean(recall_list)
    avg_f1 = np.mean(f1_list)
    
    return {
        "accuracy": accuracy,
        "precision": avg_precision,
        "recall": avg_recall,
        "f1_score": avg_f1,
        "confusion_matrix": cm
    }

def draw_accuracy_graph(train_accs, val_accs, filepath):
    """
    Plots training and validation accuracy progress lines using PIL drawing utilities.
    Saves a sleek dark-themed graph image.
    """
    width, height = 600, 400
    img = Image.new("RGB", (width, height), color=(15, 23, 42)) # Slate 900
    draw = ImageDraw.Draw(img)
    
    margin_l, margin_r = 60, 40
    margin_t, margin_b = 60, 50
    plot_w = width - margin_l - margin_r
    plot_h = height - margin_t - margin_b
    
    # Title
    draw.text((width // 2 - 100, 15), "Training vs Validation Accuracy", fill=(248, 250, 252)) # Slate 50
    
    # Axis borders
    draw.line([margin_l, margin_t, margin_l, height - margin_b], fill=(71, 85, 105), width=2) # Slate 600
    draw.line([margin_l, height - margin_b, width - margin_r, height - margin_b], fill=(71, 85, 105), width=2)
    
    # Y-axis Grid (0.0 to 1.0)
    for i in range(11):
        val = i / 10.0
        y = height - margin_b - int(val * plot_h)
        draw.line([margin_l, y, width - margin_r, y], fill=(30, 41, 59), width=1) # Slate 800
        draw.text((20, y - 5), f"{val:.1f}", fill=(148, 163, 184)) # Slate 400
        
    # X-axis ticks
    epochs = len(train_accs)
    for i in range(epochs):
        x = margin_l + int((i / (epochs - 1)) * plot_w) if epochs > 1 else margin_l + plot_w // 2
        draw.text((x - 12, height - margin_b + 10), f"Ep {i+1}", fill=(148, 163, 184))
        
    # Compute pixel coordinate arrays
    def get_pixel_coords(data):
        coords = []
        for idx, val in enumerate(data):
            x = margin_l + int((idx / (epochs - 1)) * plot_w) if epochs > 1 else margin_l + plot_w // 2
            y = height - margin_b - int(val * plot_h)
            coords.append((x, y))
        return coords

    train_coords = get_pixel_coords(train_accs)
    val_coords = get_pixel_coords(val_accs)
    
    # Draw curves
    for i in range(epochs - 1):
        draw.line([train_coords[i], train_coords[i+1]], fill=(99, 102, 241), width=3) # Brand Indigo
        draw.line([val_coords[i], val_coords[i+1]], fill=(6, 182, 212), width=3) # Brand Cyan
        
    # Legend panel
    legend_x = margin_l + 20
    legend_y = margin_t + 20
    draw.rectangle([legend_x, legend_y, legend_x + 110, legend_y + 45], fill=(30, 41, 59), outline=(71, 85, 105))
    draw.line([legend_x + 10, legend_y + 15, legend_x + 30, legend_y + 15], fill=(99, 102, 241), width=3)
    draw.text((legend_x + 35, legend_y + 10), "Train Acc", fill=(248, 250, 252))
    draw.line([legend_x + 10, legend_y + 30, legend_x + 30, legend_y + 30], fill=(6, 182, 212), width=3)
    draw.text((legend_x + 35, legend_y + 25), "Val Acc", fill=(248, 250, 252))
    
    img.save(filepath)
    print(f"[Graph] Saved accuracy graph to '{filepath}'")

def draw_confusion_matrix(cm, filepath):
    """
    Plots the confusion matrix cells and grid ticks using PIL drawing utilities.
    Saves a sleek dark-themed confusion matrix grid.
    """
    width, height = 450, 450
    img = Image.new("RGB", (width, height), color=(15, 23, 42)) # Slate 900
    draw = ImageDraw.Draw(img)
    
    grid_size = len(CLASSES)
    cell_w = 80
    start_x = 130
    start_y = 110
    
    # Title
    draw.text((width // 2 - 60, 25), "Confusion Matrix", fill=(248, 250, 252))
    
    # Axis headers
    draw.text((width // 2 - 40, height - 30), "Predicted Class", fill=(6, 182, 212))
    draw.text((20, height // 2 - 25), "True\nClass", fill=(99, 102, 241))
    
    for idx, cls in enumerate(CLASSES):
        # Column text labels
        draw.text((start_x + idx * cell_w + cell_w // 2 - 18, start_y - 25), cls, fill=(248, 250, 252))
        # Row text labels
        draw.text((start_x - 55, start_y + idx * cell_w + cell_w // 2 - 5), cls, fill=(248, 250, 252))
        
    max_val = np.max(cm) if np.max(cm) > 0 else 1
    for r in range(grid_size):
        for c in range(grid_size):
            val = cm[r][c]
            intensity = int((val / max_val) * 160) + 40
            
            # Diagonal correct outputs get cyan highlights, mistakes get slate-grey colors
            if r == c:
                cell_color = (13, 20 + intensity // 2, 30 + intensity)
            else:
                cell_color = (30 + intensity // 4, 41, 59)
                
            cell_coords = [
                start_x + c * cell_w, 
                start_y + r * cell_w, 
                start_x + (c+1) * cell_w, 
                start_y + (r+1) * cell_w
            ]
            draw.rectangle(cell_coords, fill=cell_color, outline=(71, 85, 105))
            
            text_str = str(val)
            txt_color = (255, 255, 255) if intensity > 110 else (148, 163, 184)
            draw.text((cell_coords[0] + cell_w // 2 - 5, cell_coords[1] + cell_w // 2 - 5), text_str, fill=txt_color)
            
    img.save(filepath)
    print(f"[Graph] Saved confusion matrix grid to '{filepath}'")

def train_vehicle_damage_classifier():
    """
    Main training execution function. Builds, pre-processes, fits, evaluates,
    and saves metric graphics to public directory.
    """
    # Use the downloaded Kaggle dataset directly
    dataset_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data1a"))
    
    if not os.path.exists(dataset_dir):
        raise FileNotFoundError(f"Kaggle dataset directory not found at '{dataset_dir}'. Please ensure it is downloaded.")
        
    try:
        # 1. Preprocess data
        print("Loading and preprocessing datasets from Kaggle dataset...")
        x_train, y_train = load_and_preprocess_data(dataset_dir, 'training')
        
        # Load validation folder and split it 50/50 for val and test
        x_val_all, y_val_all = load_and_preprocess_data(dataset_dir, 'validation')
        
        np.random.seed(42)
        indices = np.arange(len(x_val_all))
        np.random.shuffle(indices)
        
        split_idx = len(indices) // 2
        val_indices = indices[:split_idx]
        test_indices = indices[split_idx:]
        
        x_val, y_val = x_val_all[val_indices], y_val_all[val_indices]
        x_test, y_test = x_val_all[test_indices], y_val_all[test_indices]
        
        print(f"Train features: {x_train.shape}, Labels: {y_train.shape}")
        print(f"Val features: {x_val.shape}, Labels: {y_val.shape}")
        print(f"Test features: {x_test.shape}, Labels: {y_test.shape}")
        
        # 2. Model construction
        base_model = tf.MobileNetV2(input_shape=(224, 224, 3), include_top=False, weights='imagenet')
        
        model = tf.Sequential([
            base_model,
            tf.GlobalAveragePooling2D(),
            tf.Dropout(0.2),
            tf.Dense(128, activation='relu'),
            tf.Dense(len(CLASSES), activation='softmax')
        ])
        model.classes = CLASSES
        
        model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
        
        # 3. Fit model and record training history
        history = model.fit(
            x_train, 
            y_train, 
            validation_data=(x_val, y_val),
            epochs=5,
            batch_size=16
        )
        
        # 4. Evaluate model and compute test split metrics
        print("Evaluating model metrics on test set...")
        test_predictions = model.predict(x_test)
        metrics = calculate_metrics(y_test, test_predictions)
        
        print("\n================ EVALUATION METRICS ==================")
        print(f"Accuracy:  {metrics['accuracy'] * 100:.2f}%")
        print(f"Precision: {metrics['precision'] * 100:.2f}%")
        print(f"Recall:    {metrics['recall'] * 100:.2f}%")
        print(f"F1-Score:  {metrics['f1_score'] * 100:.2f}%")
        print("Confusion Matrix:")
        print(metrics['confusion_matrix'])
        print("======================================================")
        
        # 5. Save model weights
        model.save(MODEL_PATH)
        print(f"Successfully trained and saved model weights to '{MODEL_PATH}'")
        
        # 6. Generate and save metric curves to frontend public folder
        if os.path.exists(FRONTEND_PUBLIC_DIR):
            graph_path = os.path.join(FRONTEND_PUBLIC_DIR, 'accuracy_graph.png')
            cm_path = os.path.join(FRONTEND_PUBLIC_DIR, 'confusion_matrix.png')
            
            draw_accuracy_graph(history.history["accuracy"], history.history["val_accuracy"], graph_path)
            draw_confusion_matrix(metrics["confusion_matrix"], cm_path)
        else:
            print(f"[Warning] Frontend public directory not found at '{FRONTEND_PUBLIC_DIR}'. Skipping metric curves generation.")
            
    except Exception as e:
        print(f"[Error] Training failed: {e}")
        raise e

if __name__ == '__main__':
    train_vehicle_damage_classifier()
