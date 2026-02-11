
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from datetime import datetime
import numpy as np
from matplotlib.patches import Rectangle

# Simple roadmap visualization
fig, ax = plt.subplots(figsize=(10, 8))

# Roadmap data
roadmap = {
    'Phase 1 — Foundation': [
        '• Core TTS engine development',
        '• Basic web interface implementation', 
        '• User authentication system',
        '• Audio file management'
    ],
    'Phase 2 — Enhancement': [
        '• Advanced voice controls',
        '• Batch processing capabilities',
        '• Mobile application planning',
        '• API documentation'
    ],
    'Phase 3 — Expansion': [
        '• Voice cloning technology',
        '• Real-time streaming',
        '• Enterprise features',
        '• Plugin ecosystem'
    ],
    'Phase 4 — Maturation': [
        '• AI voice customization',
        '• Collaborative features',
        '• Advanced analytics',
        '• Global CDN expansion'
    ]
}

# Colors for each phase
colors = ['#2E86AB', '#A23B72', '#F18F01', '#73AB84']

# Create visual roadmap
y_pos = 0.95
for idx, (phase_name, features) in enumerate(roadmap.items()):
    color = colors[idx]
    
    # Add phase header with colored background
    ax.text(0.5, y_pos, phase_name, fontsize=14, fontweight='bold',
           ha='center', va='center', transform=ax.transAxes,
           bbox=dict(boxstyle='round,pad=0.5', facecolor=color, alpha=0.8, edgecolor='black'))
    
    y_pos -= 0.08
    
    # Add features
    for feature in features:
        ax.text(0.5, y_pos, feature, fontsize=11,
               ha='center', va='center', transform=ax.transAxes,
               bbox=dict(boxstyle='round,pad=0.2', facecolor='white', 
                        alpha=0.7, edgecolor=color, linewidth=1))
        y_pos -= 0.07
    
    y_pos -= 0.05  # Space between phases

# Add connecting arrows
arrow_y_positions = [0.84, 0.59, 0.34, 0.09]
for i in range(3):  # Connect first 3 phases to next
    ax.annotate('', xy=(0.5, arrow_y_positions[i+1]), xytext=(0.5, arrow_y_positions[i]-0.02),
               arrowprops=dict(arrowstyle='->', color='gray', lw=2),
               xycoords='axes fraction', textcoords='axes fraction')

# Remove axes
ax.set_xlim(0, 1)
ax.set_ylim(0, 1)
ax.axis('off')

# Add title
ax.text(0.5, 1.02, 'EchoVerse Development Roadmap', fontsize=16, 
       fontweight='bold', ha='center', transform=ax.transAxes)

plt.tight_layout()
plt.show()
