import tensorflow as tf
import numpy as np

# -------------------------------------------------
# Rule:
# Marks < 40  -> Fail
# Marks >= 40 -> Pass
# -------------------------------------------------

# Training marks
x = np.array([10, 20, 30, 35, 39, 40, 50, 60, 80, 90], dtype=float)

# Convert marks to small values
# 10 becomes 0.10
# 40 becomes 0.40
# 90 becomes 0.90
# x = x / 100

# Answers
# 0 = Fail
# 1 = Pass
y = np.array([0, 0, 0, 0, 0, 1, 1, 1, 1, 1], dtype=float)

# Create model
model = tf.keras.Sequential([
    tf.keras.layers.Dense(1, input_shape=[1], activation="sigmoid")
])

# Compile model
model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=0.1),
    loss="binary_crossentropy",
    metrics=["accuracy"]
)

# Train model
model.fit(x, y, epochs=1000, verbose=0)

# Test marks
test_marks = [17, 35, 40, 75]

for marks in test_marks:
    # Convert test mark also to small value
    # test_value = np.array([marks / 100], dtype=float)
    test_value = np.array([marks ], dtype=float)

    prediction = model.predict(test_value, verbose=0)

    value = prediction[0][0]

    if value >= 0.5:
        result = "Pass"
    else:
        result = "Fail"

    print("Marks:", marks, "Prediction value:", value, "Result:", result)