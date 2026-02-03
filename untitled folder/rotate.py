import numpy as np
import matplotlib.pyplot as plt

# Function to generate hexagon vertices
def hexagon_vertices(radius=1):
    angles = np.linspace(0, 2 * np.pi, 7)[:-1]  # 6 sides, close the loop
    return np.array([radius * np.cos(angles), radius * np.sin(angles)])

# Parameters
layers = 200
points_per_side = 100

# Base hexagon vertices
hexagon = hexagon_vertices()
x, y, z = [], [], []

# Loop through each layer to create the evolving hexagon shape
for i in range(layers):
    # Deformation function based on a parabola (scales along the layer index)
    deformation_factor = (i / layers) ** 2 * np.sin(i * np.pi / layers)

    # Create layer with deformation applied between vertices
    x_layer, y_layer = [], []
    for j in range(len(hexagon[0])):
        # Current and next vertices
        x1, y1 = hexagon[:, j]
        x2, y2 = hexagon[:, (j + 1) % len(hexagon[0])]

        # Generate points between the two vertices
        for t in np.linspace(0, 1, points_per_side):
            # Interpolate between vertices
            xt = (1 - t) * x1 + t * x2
            yt = (1 - t) * y1 + t * y2

            # Apply parabolic deformation along the segment
            deformation = deformation_factor * (4 * t * (1 - t))  # Parabola: max at t=0.5
            xt += deformation * (y2 - y1)  # Perpendicular deformation in X
            yt -= deformation * (x2 - x1)  # Perpendicular deformation in Y

            # Append to the layer
            x_layer.append(xt)
            y_layer.append(yt)

    # Stack the layer with a vertical offset
    z_layer = np.full(len(x_layer), i * 0.05)
    x.append(x_layer)
    y.append(y_layer)
    z.append(z_layer)

# Convert lists to arrays for plotting
x = np.array(x)
y = np.array(y)
z = np.array(z)

# Plot the evolving 3D hexagon surface
fig = plt.figure(figsize=(12, 8))
ax = fig.add_subplot(111, projection='3d')
ax.plot_surface(x, y, z, cmap='coolwarm', edgecolor='none')

# Set labels and display
ax.set_title("Evolving 3D Hexagon with Vertex-to-Vertex Parabolic Deformation")
ax.set_xlabel("X Axis")
ax.set_ylabel("Y Axis")
ax.set_zlabel("Z Axis")
plt.show()