import tensorflow as tf
import matplotlib.pyplot as plt 
import numpy as np
x = np.array([10, 20, 30, 35, 39, 40, 40, 50, 60, 80, 90], dtype=float)
x = x / 100

y = np.array([0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1], dtype=float)

plt.plot(x,y)
plt.grid(True)
plt.xlabel("Input Marks")
plt.ylabel("Result Pass-1/fail-0")
plt.title("Input Marks vs Result Pass-1/fail-0")
plt.legend()
plt.show()
inputs = tf.keras.Input(shape=[1])

outputs = tf.keras.layers.Dense(1, activation="sigmoid")(inputs)

model = tf.keras.Model(inputs=inputs, outputs=outputs)


model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=0.1),
    loss="binary_crossentropy",
    metrics=["accuracy"]
)

model.fit(x, y, epochs=1000, verbose=0)

test_marks = [17, 35, 40, 75]
results=[0 for x in test_marks]
index=0
for marks in test_marks:

    test_value = np.array([marks / 100], dtype=float)

    prediction = model.predict(test_value, verbose=0)

    value = prediction[0][0]

    if value >= 0.5:
        result = "Pass"
        results[index]=1
    else:
        result = "Fail"
        results[index]=0
    index+=1
    print("Marks:", marks, "Prediction value:",
          round(value, 4), "Result:", result)
    
plt.plot(test_marks,y)
plt.grid(True)
plt.xlabel("Test Marks")
plt.ylabel("Predicted Result Pass-1/fail-0")
plt.title("Output Marks vs Predicted Result Pass-1/fail-0")
plt.legend()
plt.show()    
