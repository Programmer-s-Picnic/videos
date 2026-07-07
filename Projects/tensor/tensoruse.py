import tensorflow as tf
import numpy as np
import matplotlib.pyplot as plt
# Input Marks
x = np.array([10, 20, 30, 35, 39, 40,40, 50, 60, 80, 90], dtype=float)
print(x)#Input Marks
x = x/100  # Input and output will always be between 0 and 1. Sigmoid Scaling or Normalization
print(x)
y = np.array([0, 0, 0, 0, 0, 1,1, 1, 1, 1, 1], dtype=float)
print("Input\n", x, "\nOutput\n", y)
inputs = tf.keras.Input(shape=[1])#Means 1 input Marks
outputs=tf.keras.layers.Dense(1,activation="sigmoid")(inputs)#Only 1 output
model=tf.keras.Model(inputs=inputs,outputs=outputs)
model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=0.1),
    loss="binary_crossentropy",
    metrics=["accuracy"]
)
#Optimizer, loss function, metrics
model.fit(x,y,epochs=1000,verbose=0)# Fit the model. Epochs is the number ofd times the model is trained
plt.xlabel("Input Marks")
plt.ylabel("Result Pass=1/Fail=0")
plt.grid(True)
plt.title("Input-Marks vs Output-Results")
plt.legend()
plt.plot(x,y)
plt.show()
print(model)
test_marks = [17, 35, 40, 75]
results = [0 for x in test_marks]
index = 0
for marks in test_marks:

    test_value = np.array([marks / 100], dtype=float)

    prediction = model.predict(test_value, verbose=0)
    print("Prediction\n",prediction)

    value = prediction[0][0]

    if value >= 0.5:
        result = "Pass"
        results[index] = 1
    else:
        result = "Fail"
        results[index] = 0
    index += 1
    print("Marks:", marks, "Prediction value:",
          round(value, 4), "Result:", result)

plt.xlabel("Input Test Marks")
plt.ylabel("Predicted Result Pass=1/Fail=0")
plt.grid(True)
plt.title("Input-Test-Marks vs Predicted-Output-Results")
plt.legend()
plt.plot(x,y)
plt.show()
