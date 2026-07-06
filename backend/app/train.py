import os
import shutil
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance
import tensorflow as tf
from tensorflow.keras import layers, models, callbacks

# Model Configurations
IMAGE_SIZE = (224, 224)
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'vehicle_damage_model.h5')
FRONTEND_PUBLIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'public'))

def discover_classes(dataset_dir):
    """
    Dynamically lists the subdirectories in the training split directory to discover classes.
    """
    train_dir = os.path.join(dataset_dir, 'training')
    if not os.path.exists(train_dir):
        train_dir = os.path.join(dataset_dir, 'validation')
    if os.path.exists(train_dir):
        return sorted([d for d in os.listdir(train_dir) if os.path.isdir(os.path.join(train_dir, d))])
    raise FileNotFoundError(f"Could not discover classes: training directory '{train_dir}' does not exist.")

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

def draw_confusion_matrix(cm, filepath, classes):
    """
    Plots the confusion matrix cells and grid ticks using PIL drawing utilities.
    Saves a sleek dark-themed confusion matrix grid.
    """
    width, height = 450, 450
    img = Image.new("RGB", (width, height), color=(15, 23, 42)) # Slate 900
    draw = ImageDraw.Draw(img)
    
    grid_size = len(classes)
    cell_w = 80
    start_x = 130
    start_y = 110
    
    # Title
    draw.text((width // 2 - 60, 25), "Confusion Matrix", fill=(248, 250, 252))
    
    # Axis headers
    draw.text((width // 2 - 40, height - 30), "Predicted Class", fill=(6, 182, 212))
    draw.text((20, height // 2 - 25), "True\nClass", fill=(99, 102, 241))
    
    for idx, cls in enumerate(classes):
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
    Main training execution function using Keras/TensorFlow.
    """
    dataset_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data1a"))
    
    if not os.path.exists(dataset_dir):
        raise FileNotFoundError(f"Kaggle dataset directory not found at '{dataset_dir}'.")
        
    try:
        # Discover classes dynamically
        classes = discover_classes(dataset_dir)
        print(f"Discovered dataset classes dynamically: {classes}")

        # Construct tf.data pipelines
        train_dir = os.path.join(dataset_dir, 'training')
        val_dir = os.path.join(dataset_dir, 'validation')
        
        print("Loading training dataset...")
        train_ds = tf.keras.utils.image_dataset_from_directory(
            train_dir,
            image_size=IMAGE_SIZE,
            batch_size=32,
            label_mode='int',
            shuffle=True,
            seed=42
        )
        
        print("Loading validation/test dataset...")
        val_all_ds = tf.keras.utils.image_dataset_from_directory(
            val_dir,
            image_size=IMAGE_SIZE,
            batch_size=32,
            label_mode='int',
            shuffle=True,
            seed=42
        )
        
        # Split val_all_ds 50/50 into validation and test sets
        total_batches = val_all_ds.cardinality().numpy()
        val_batches = total_batches // 2
        
        val_ds = val_all_ds.take(val_batches)
        test_ds = val_all_ds.skip(val_batches)
        
        print(f"Number of training batches: {train_ds.cardinality().numpy()}")
        print(f"Number of validation batches: {val_ds.cardinality().numpy()}")
        print(f"Number of test batches: {test_ds.cardinality().numpy()}")
        
        # Enable caching and prefetching for performance
        AUTOTUNE = tf.data.AUTOTUNE
        train_ds = train_ds.cache().prefetch(buffer_size=AUTOTUNE)
        val_ds = val_ds.cache().prefetch(buffer_size=AUTOTUNE)
        test_ds = test_ds.cache().prefetch(buffer_size=AUTOTUNE)

        # 2. Model construction
        print("Constructing MobileNetV2 transfer learning model...")
        
        # Data Augmentation Layers
        data_augmentation = tf.keras.Sequential([
            layers.RandomFlip("horizontal"),
            layers.RandomRotation(0.1),
            layers.RandomContrast(0.1),
        ])
        
        # Pre-trained base model
        base_model = tf.keras.applications.MobileNetV2(
            input_shape=(224, 224, 3),
            include_top=False,
            weights='imagenet'
        )
        base_model.trainable = False  # Freeze pre-trained weights
        
        # Assemble model
        inputs = tf.keras.Input(shape=(224, 224, 3))
        x = data_augmentation(inputs)
        x = layers.Rescaling(1./127.5, offset=-1)(x)  # Normalize inputs to [-1, 1] for MobileNetV2
        x = base_model(x, training=False)
        x = layers.GlobalAveragePooling2D()(x)
        x = layers.Dropout(0.3)(x)
        outputs = layers.Dense(len(classes), activation='softmax')(x)
        
        model = tf.keras.Model(inputs, outputs)
        
        # Compile
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
            loss=tf.keras.losses.SparseCategoricalCrossentropy(),
            metrics=['accuracy']
        )
        
        # Set up callbacks
        checkpoint_callback = callbacks.ModelCheckpoint(
            filepath=MODEL_PATH,
            save_best_only=True,
            monitor='val_accuracy',
            mode='max',
            verbose=1
        )
        early_stopping_callback = callbacks.EarlyStopping(
            monitor='val_accuracy',
            patience=5,
            restore_best_weights=True,
            verbose=1
        )
        reduce_lr_callback = callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.2,
            patience=3,
            min_lr=1e-6,
            verbose=1
        )
        
        # 3. Fit model
        print("Starting training...")
        history = model.fit(
            train_ds,
            validation_data=val_ds,
            epochs=15,
            callbacks=[checkpoint_callback, early_stopping_callback, reduce_lr_callback]
        )
        
        # Save model explicitly to guarantee Keras format
        model.save(MODEL_PATH)
        print(f"Model saved successfully to {MODEL_PATH}")
        
        # 4. Evaluate on Test set
        print("Evaluating model metrics on test set...")
        y_true = []
        y_pred = []
        for x_batch, y_batch in test_ds:
            preds = model.predict(x_batch, verbose=0)
            y_true.extend(y_batch.numpy())
            y_pred.extend(np.argmax(preds, axis=1))
            
        y_true = np.array(y_true)
        y_pred = np.array(y_pred)
        
        # Calculate confusion matrix
        cm = tf.math.confusion_matrix(y_true, y_pred).numpy()
        
        # Calculate metrics
        tp = cm[0, 0] if cm.shape[0] > 0 and cm.shape[1] > 0 else 0
        fp = cm[1, 0] if cm.shape[0] > 1 and cm.shape[1] > 0 else 0
        fn = cm[0, 1] if cm.shape[0] > 0 and cm.shape[1] > 1 else 0
        tn = cm[1, 1] if cm.shape[0] > 1 and cm.shape[1] > 1 else 0
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
        accuracy = (tp + tn) / (tp + tn + fp + fn) if (tp + tn + fp + fn) > 0 else 0.0
        
        # Get final history accuracies
        final_train_acc = history.history["accuracy"][-1]
        final_val_acc = history.history["val_accuracy"][-1]
        
        print("\n================ EVALUATION METRICS ==================")
        print(f"Final Training Accuracy:   {final_train_acc * 100:.2f}%")
        print(f"Final Validation Accuracy: {final_val_acc * 100:.2f}%")
        print(f"Test Accuracy:             {accuracy * 100:.2f}%")
        print(f"Precision:                 {precision * 100:.2f}%")
        print(f"Recall:                    {recall * 100:.2f}%")
        print(f"F1-Score:                  {f1 * 100:.2f}%")
        print("Confusion Matrix:")
        print(cm)
        print("======================================================")
        
        # 5. Generate and save metric curves to frontend public folder
        if os.path.exists(FRONTEND_PUBLIC_DIR):
            graph_path = os.path.join(FRONTEND_PUBLIC_DIR, 'accuracy_graph.png')
            cm_path = os.path.join(FRONTEND_PUBLIC_DIR, 'confusion_matrix.png')
            
            draw_accuracy_graph(history.history["accuracy"], history.history["val_accuracy"], graph_path)
            draw_confusion_matrix(cm, cm_path, classes)
        else:
            print(f"[Warning] Frontend public directory not found. Skipping curves.")
            
    except Exception as e:
        print(f"[Error] Training failed: {e}")
        raise e

if __name__ == '__main__':
    train_vehicle_damage_classifier()
