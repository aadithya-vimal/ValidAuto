import os
import json
import numpy as np
from PIL import Image

class MobileNetV2:
    """
    Emulates MobileNetV2 base model for transfer learning.
    In raw NumPy, it acts as a pass-through layer for image features.
    """
    def __init__(self, input_shape=(224, 224, 3), include_top=False, weights='imagenet'):
        self.input_shape = input_shape
        self.include_top = include_top
        self.weights = weights
        print(f"[MobileNetV2] Emulating load of weights '{weights}' with input {input_shape}")

    def __call__(self, x):
        return x

class Dense:
    """
    Emulates a Dense layer.
    """
    def __init__(self, units, activation='relu'):
        self.units = units
        self.activation = activation

class GlobalAveragePooling2D:
    """
    Emulates a Global Average Pooling layer.
    """
    def __init__(self):
        pass

class Dropout:
    """
    Emulates a Dropout layer.
    """
    def __init__(self, rate):
        self.rate = rate

class History:
    """
    Emulates the tf.keras.callbacks.History object.
    Holds the metrics logged across training epochs.
    """
    def __init__(self):
        self.history = {
            "accuracy": [],
            "val_accuracy": [],
            "loss": [],
            "val_loss": []
        }

class Sequential:
    """
    Emulates tf.keras.models.Sequential.
    Implements a softmax regression model in NumPy that updates its weights 
    using gradient descent during training.
    """
    def __init__(self, layers=None):
        self.layers = layers or []
        self.classes = ['scratch', 'dent', 'none']
        self.weights = None
        self.bias = None

    def add(self, layer):
        self.layers.append(layer)

    def compile(self, optimizer='adam', loss='categorical_crossentropy', metrics=None):
        print(f"[Model] Compiled with optimizer='{optimizer}', loss='{loss}', metrics={metrics or ['accuracy']}")

    def _extract_and_downsample_features(self, x):
        """
        Downsamples 224x224x3 image matrices to a 32x32x3 grid (3072 values)
        to make raw NumPy training extremely fast and memory-efficient.
        """
        N = x.shape[0]
        # Downsample by taking every 7th pixel
        small_x = x[:, ::7, ::7, :]
        return small_x.reshape(N, -1)

    def fit(self, x, y, validation_data=None, epochs=5, batch_size=32):
        """
        Trains the softmax classification weights using gradient descent.
        Logs metrics inside a History object.
        """
        print(f"Training on {len(x)} samples, validating on {len(validation_data[0]) if validation_data else 0} samples...")
        
        x_flat = self._extract_and_downsample_features(x)
        num_features = x_flat.shape[1]
        num_classes = len(self.classes)

        # One-hot encode labels if necessary
        if len(y.shape) == 1:
            y_onehot = np.zeros((len(y), num_classes))
            y_onehot[np.arange(len(y)), y.astype(int)] = 1
        else:
            y_onehot = y

        # Initialize weights and biases
        np.random.seed(42)
        self.weights = np.random.randn(num_features, num_classes) * 0.001
        self.bias = np.zeros(num_classes)

        # Instantiate emulated History object
        history_obj = History()

        lr = 0.05
        for epoch in range(epochs):
            # Forward pass: logit calculation and softmax
            logits = np.dot(x_flat, self.weights) + self.bias
            exp_logits = np.exp(logits - np.max(logits, axis=1, keepdims=True))
            probs = exp_logits / np.sum(exp_logits, axis=1, keepdims=True)

            # Categorical crossentropy loss
            loss = -np.mean(np.sum(y_onehot * np.log(probs + 1e-15), axis=1))

            # Accuracy calculation
            preds = np.argmax(probs, axis=1)
            targets = np.argmax(y_onehot, axis=1)
            accuracy = np.mean(preds == targets)

            # Backward pass: Compute gradients
            dlogits = (probs - y_onehot) / len(x)
            dw = np.dot(x_flat.T, dlogits)
            db = np.sum(dlogits, axis=0)

            # Weight updates
            self.weights -= lr * dw
            self.bias -= lr * db

            # Log metrics
            history_obj.history["loss"].append(float(loss))
            history_obj.history["accuracy"].append(float(accuracy))

            val_log = ""
            if validation_data:
                val_x, val_y = validation_data
                val_x_flat = self._extract_and_downsample_features(val_x)
                
                if len(val_y.shape) == 1:
                    val_y_onehot = np.zeros((len(val_y), num_classes))
                    val_y_onehot[np.arange(len(val_y)), val_y.astype(int)] = 1
                else:
                    val_y_onehot = val_y

                val_logits = np.dot(val_x_flat, self.weights) + self.bias
                val_exp = np.exp(val_logits - np.max(val_logits, axis=1, keepdims=True))
                val_probs = val_exp / np.sum(val_exp, axis=1, keepdims=True)
                val_loss = -np.mean(np.sum(val_y_onehot * np.log(val_probs + 1e-15), axis=1))
                val_preds = np.argmax(val_probs, axis=1)
                val_targets = np.argmax(val_y_onehot, axis=1)
                val_accuracy = np.mean(val_preds == val_targets)
                
                val_log = f" - val_loss: {val_loss:.4f} - val_accuracy: {val_accuracy:.4f}"
                history_obj.history["val_loss"].append(float(val_loss))
                history_obj.history["val_accuracy"].append(float(val_accuracy))

            print(f"Epoch {epoch+1}/{epochs} - loss: {loss:.4f} - accuracy: {accuracy:.4f}{val_log}")

        return history_obj

    def save(self, filepath):
        """
        Saves the trained weights, biases, and class labels as JSON.
        """
        model_data = {
            "weights": self.weights.tolist() if self.weights is not None else None,
            "bias": self.bias.tolist() if self.bias is not None else None,
            "classes": self.classes
        }
        with open(filepath, 'w') as f:
            json.dump(model_data, f)
        print(f"[Model] Saved trained weights to '{filepath}'")

    def predict(self, x):
        """
        Executes prediction/forward pass over a batch of images.
        """
        x_flat = self._extract_and_downsample_features(x)
        logits = np.dot(x_flat, self.weights) + self.bias
        exp_logits = np.exp(logits - np.max(logits, axis=1, keepdims=True))
        probs = exp_logits / np.sum(exp_logits, axis=1, keepdims=True)
        return probs

def load_model(filepath):
    """
    Loads weights from serialized JSON parameters and initializes Sequential emulator.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Model file '{filepath}' not found.")

    with open(filepath, 'r') as f:
        model_data = json.load(f)

    model = Sequential()
    if model_data["weights"] is not None:
        model.weights = np.array(model_data["weights"])
    if model_data["bias"] is not None:
        model.bias = np.array(model_data["bias"])
    model.classes = model_data["classes"]
    print(f"[Model] Emulated model successfully loaded from '{filepath}'")
    return model

# Image Utilities emulating tf.keras.preprocessing.image
def load_img(path, target_size=(224, 224)):
    """
    Loads and resizes image using PIL.
    """
    img = Image.open(path).convert('RGB')
    return img.resize(target_size)

def img_to_array(img):
    """
    Converts PIL image to float32 NumPy array.
    """
    return np.array(img, dtype=np.float32)
