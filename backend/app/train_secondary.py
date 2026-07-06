# backend/app/train_secondary.py
import os
import shutil
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, callbacks

# Model Configurations
IMAGE_SIZE = (224, 224)
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'secondary_damage_model.h5')

def train_secondary_classifier():
    dataset_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data_secondary"))
    
    if not os.path.exists(dataset_dir):
        raise FileNotFoundError(f"Secondary dataset directory not found at '{dataset_dir}'.")
        
    try:
        # Discover classes dynamically
        train_dir = os.path.join(dataset_dir, 'training')
        val_dir = os.path.join(dataset_dir, 'validation')
        
        classes = sorted([d for d in os.listdir(train_dir) if os.path.isdir(os.path.join(train_dir, d))])
        print(f"Discovered secondary dataset classes dynamically: {classes}")

        print("Loading training dataset...")
        train_ds = tf.keras.utils.image_dataset_from_directory(
            train_dir,
            image_size=IMAGE_SIZE,
            batch_size=16,
            label_mode='int',
            shuffle=True,
            seed=42
        )
        
        print("Loading validation/test dataset...")
        val_all_ds = tf.keras.utils.image_dataset_from_directory(
            val_dir,
            image_size=IMAGE_SIZE,
            batch_size=16,
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
        
        # Enable caching and prefetching
        AUTOTUNE = tf.data.AUTOTUNE
        train_ds = train_ds.cache().prefetch(buffer_size=AUTOTUNE)
        val_ds = val_ds.cache().prefetch(buffer_size=AUTOTUNE)
        test_ds = test_ds.cache().prefetch(buffer_size=AUTOTUNE)

        # Model construction
        print("Constructing MobileNetV2 transfer learning model for secondary damage classification...")
        
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
        
        # Fit model
        print("Starting training...")
        history = model.fit(
            train_ds,
            validation_data=val_ds,
            epochs=15,
            callbacks=[checkpoint_callback, early_stopping_callback]
        )
        
        # Save model explicitly
        model.save(MODEL_PATH)
        print(f"Secondary model saved successfully to {MODEL_PATH}")
        
        # Evaluate on Test set
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
        correct = np.sum(y_true == y_pred)
        total = len(y_true)
        accuracy = correct / total if total > 0 else 0.0
        
        print("\n================ EVALUATION METRICS (SECONDARY) ==================")
        print(f"Test Accuracy:             {accuracy * 100:.2f}%")
        print("Confusion Matrix:")
        print(cm)
        print("==================================================================")
        
    except Exception as e:
        print(f"[Error] Training failed: {e}")
        raise e

if __name__ == '__main__':
    train_secondary_classifier()
