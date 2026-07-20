import streamlit as st
import numpy as np
import matplotlib.pyplot as plt
from PIL import Image
import random
import time

# Set page configuration
st.set_page_config(
    page_title="Global Fashion Generator",
    page_icon="👗",
    layout="wide"
)

# Enhanced international fashion elements with full African representation
AFRICAN_FABRICS = [
    "Ankara", "Kente", "Bogolan", "Adire", "Korhogo", "Aso Oke", "Bazin", 
    "Kitenge", "Shweshwe", "Kanga", "Kikoy", "Lamba", "Mudcloth", "George"
]

ASIAN_FABRICS = [
    "Kimono Silk", "Brocade", "Ikat", "Batik", "Pongee", "Habutai", "Raw Silk",
    "Organza", "Chiffon", "Damask", "Cheongsam Silk", "Sari Silk", "Ikkat"
]

EUROPEAN_FABRICS = [
    "Tweed", "Tartan", "Lace", "Jacquard", "Velvet", "Chambray", "Corduroy",
    "Muslin", "Georgette", "Tulle", "Voile", "Gabaridine", "Seersucker"
]

AMERICAN_FABRICS = [
    "Denim", "Flannel", "Suede", "Leather", "Quilted Cotton", "Chino", "Oxford"
]

# Combine all fabrics
INTERNATIONAL_FABRICS = AFRICAN_FABRICS + ASIAN_FABRICS + EUROPEAN_FABRICS + AMERICAN_FABRICS

INTERNATIONAL_DETAILS = [
    "embroidery", "beading", "fringe", "gold threadwork", "geometric patterns",
    "hand-painted designs", "tassels", "appliqué", "contrast piping", "woven details",
    "cowrie shells", "sequins", "pearl accents", "feather trim", "lace inserts",
    "ruffles", "pleats", "smocking", "cut-out details", "metal accents"
]

INTERNATIONAL_VIBES = [
    "minimalist", "bohemian", "streetwear", "elegant", "avant-garde",
    "romantic", "utilitarian", "retro", "futuristic", "sustainable",
    "Afrofuturism", "cultural heritage", "festive celebration", "modern traditional",
    "royal elegance", "artisanal craftsmanship", "vibrant energy", "sophisticated luxury"
]

# Enhanced cultural influences with full African representation
CULTURAL_INFLUENCES = [
    "West African", "East African", "Southern African", "North African", 
    "Central African", "African Diaspora", "East Asian", "South Asian", 
    "Southeast Asian", "Middle Eastern", "European", "North American", 
    "South American", "Central American", "Caribbean", "Indigenous", 
    "Global Fusion", "No specific cultural influence"
]

CATEGORIES = ['dress', 'jumpsuit', 'top', 'blouse', 'jacket', 'coat', 'skirt', 'trousers', 
              'shorts', 'overalls', 'cape', 'kimono', 'boubou', 'danshiki', 'sari', 'hanbok',
              'thobe', 'kanga', 'kikoi', 'agbada', 'dashiki', 'habesha kemis', 'kanzu']

SILHOUETTES = ['A-line', 'fit and flare', 'empire waist', 'oversized', 'tailored', 
               'flowing', 'bodycon', 'asymmetrical', 'sheath', 'trapeze', 'balloon', 'cocoon']

COLORS = ['black', 'white', 'navy', 'red', 'emerald', 'saffron', 'burgundy', 'ochre',
          'indigo', 'gold', 'crimson', 'ivory', 'turquoise', 'rose', 'lavender', 'mustard']

NECKLINES = ['boat', 'V-neck', 'round', 'keyhole', 'halter', 'cowl', 'square', 
             'asymmetrical', 'off-shoulder', 'high neck', 'scoop', 'sweetheart']

SLEEVES = ['bell', 'batwing', 'cap', 'puffed', 'off-shoulder', 'long fitted', 
           'short flutter', 'kimono', 'raglan', 'leg-of-mutton', 'bracelet', 'sleeveless']

LENGTHS = ['mini', 'midi', 'maxi', 'ankle', 'cropped', 'knee-length', 'floor-length', 'variable']

# Function to generate international fashion prompts
def generate_international_prompt(category, silhouette, fabrics, color, neckline, sleeves, length, details, vibe, cultural_influence):
    prompt_lines = [
        'Ultra-realistic editorial fashion photo.',
        'Model: diverse international model, fashion pose.',
        f'Garment: {category}{f", {silhouette} silhouette" if silhouette else ""}.',
        f'Fabrics: {", ".join(fabrics)}.' if fabrics else '',
        f'Color: {color}.' if color else '',
        f'Neckline: {neckline}.' if neckline else '',
        f'Sleeves: {sleeves}.' if sleeves else '',
        f'Length: {length}.' if length else '',
        f'Details: {", ".join(details)}.' if details else '',
        f'Style: {", ".join(vibe)}.' if vibe else '',
        f'Cultural influence: {cultural_influence}.' if cultural_influence != "No specific cultural influence" else '',
        'Set: minimalist studio with concrete textures.',
        'Lighting: soft natural light with subtle studio lighting.',
        'Editorial composition, high fashion photography.',
        'Fully clothed, tasteful editorial, no nudity.'
    ]
    
    return [line for line in prompt_lines if line]

# Function to generate a placeholder fashion image with pattern based on cultural influence
def generate_fashion_image(prompt, color, cultural_influence):
    # Create a placeholder image with the dominant color
    width, height = 300, 450
    img = np.zeros((height, width, 3), dtype=np.uint8)
    
    # Convert color name to RGB
    color_map = {
        'black': (0, 0, 0),
        'white': (255, 255, 255),
        'navy': (0, 0, 128),
        'red': (255, 0, 0),
        'emerald': (80, 200, 120),
        'saffron': (244, 196, 48),
        'burgundy': (128, 0, 32),
        'ochre': (204, 119, 34),
        'indigo': (75, 0, 130),
        'gold': (255, 215, 0),
        'crimson': (220, 20, 60),
        'ivory': (255, 255, 240),
        'turquoise': (64, 224, 208),
        'rose': (255, 192, 203),
        'lavender': (230, 230, 250),
        'mustard': (255, 219, 88)
    }
    
    rgb_color = color_map.get(color, (200, 200, 200))
    
    # Fill with the dominant color
    img[:, :] = rgb_color
    
    # Add different patterns based on cultural influence
    if cultural_influence == "West African":
        # Ankara-inspired pattern
        for i in range(0, width, 40):
            for j in range(0, height, 40):
                if (i//40 + j//40) % 2 == 0:
                    img[j:j+20, i:i+20] = [min(c + 50, 255) for c in rgb_color]
                    # Add smaller pattern elements
                    img[j+5:j+15, i+5:i+15] = [max(c - 50, 0) for c in rgb_color]
    
    elif cultural_influence == "East African":
        # Kanga-inspired pattern with border
        img[0:20, :] = [min(c + 30, 255) for c in rgb_color]  # Top border
        img[height-20:height, :] = [min(c + 30, 255) for c in rgb_color]  # Bottom border
        for i in range(0, width, 25):
            for j in range(40, height-40, 25):
                if random.random() > 0.7:
                    img[j:j+8, i:i+8] = [min(c + 40, 255) for c in rgb_color]
    
    elif cultural_influence == "Southern African":
        # Ndebele-inspired geometric patterns
        for i in range(0, width, 30):
            for j in range(0, height, 30):
                if (i//30) % 2 == 0:
                    img[j:j+15, i:i+5] = [min(c + 60, 255) for c in rgb_color]
                else:
                    img[j:j+5, i:i+15] = [min(c + 60, 255) for c in rgb_color]
    
    elif cultural_influence == "North African":
        # Moroccan-inspired geometric patterns
        for i in range(0, width, 35):
            for j in range(0, height, 35):
                if (i//35 + j//35) % 3 == 0:
                    # Create diamond pattern
                    center_x, center_y = i+17, j+17
                    for k in range(0, 8):
                        img[center_y-k:center_y+k, center_x-k:center_x+k] = [min(c + 40, 255) for c in rgb_color]
    
    elif cultural_influence == "Central African":
        # Kuba cloth inspired patterns
        for i in range(0, width, 25):
            for j in range(0, height, 25):
                if random.random() > 0.6:
                    # Create raffia-like patterns
                    size = random.randint(5, 10)
                    img[j:j+size, i:i+size] = [min(c + random.randint(20, 60), 255) for c in rgb_color]
    
    elif cultural_influence == "African Diaspora":
        # Fusion pattern combining elements
        for i in range(0, width, 30):
            for j in range(0, height, 30):
                if (i//30) % 2 == 0:
                    img[j:j+10, i:i+10] = [min(c + 40, 255) for c in rgb_color]
                else:
                    img[j+5:j+15, i+5:i+15] = [min(c + 20, 255) for c in rgb_color]
    
    elif cultural_influence == "East Asian":
        # Delicate pattern
        for i in range(0, width, 15):
            for j in range(0, height, 30):
                if random.random() > 0.7:
                    img[j:j+5, i:i+5] = [min(c + 70, 255) for c in rgb_color]
    
    elif cultural_influence == "South Asian":
        # intricate pattern
        for i in range(0, width, 20):
            for j in range(0, height, 20):
                if random.random() > 0.5:
                    img[j:j+8, i:i+8] = [min(c + 40, 255) for c in rgb_color]
    
    elif cultural_influence == "European":
        # Classic subtle pattern
        for i in range(0, width, 25):
            for j in range(0, height, 25):
                if (i//25) % 2 == (j//25) % 2:
                    img[j:j+12, i:i+12] = [min(c + 30, 255) for c in rgb_color]
    
    else:
        # Generic pattern for other influences
        for i in range(0, width, 20):
            for j in range(0, height, 20):
                if (i//20 + j//20) % 2 == 0:
                    img[j:j+10, i:i+10] = [min(c + 30, 255) for c in rgb_color]
    
    return img

def main():
    st.title("🌍 Global Fashion Generator")
    st.markdown("Create diverse fashion designs from around the world with detailed attributes")
    
    # Create sidebar for controls
    with st.sidebar:
        st.header("Design Attributes")
        
        # Cultural influence selection
        cultural_influence = st.selectbox("Cultural Influence", CULTURAL_INFLUENCES, index=0)
        
        # Show African sub-regions if African influence is selected
        if cultural_influence in ["West African", "East African", "Southern African", "North African", "Central African", "African Diaspora"]:
            st.info("✨ Selected African cultural influence")
        
        # Category selection
        category = st.selectbox("Category", CATEGORIES, index=0)
        
        # Silhouette selection
        silhouette = st.selectbox("Silhouette", [""] + SILHOUETTES, index=0)
        
        # Fabric selection (multi-select)
        fabrics = st.multiselect("Fabrics", INTERNATIONAL_FABRICS)
        
        # Color selection
        color = st.selectbox("Color", [""] + COLORS, index=0)
        
        # Neckline selection
        neckline = st.selectbox("Neckline", [""] + NECKLINES, index=0)
        
        # Sleeves selection
        sleeves = st.selectbox("Sleeves", [""] + SLEEVES, index=0)
        
        # Length selection
        length = st.selectbox("Length", [""] + LENGTHS, index=0)
        
        # Details selection (multi-select)
        details = st.multiselect("Details", INTERNATIONAL_DETAILS)
        
        # Vibe selection (multi-select)
        vibe = st.multiselect("Vibe", INTERNATIONAL_VIBES)
        
        # Generate button
        generate_btn = st.button("Generate Fashion Design", type="primary")
    
    # Main content area
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.subheader("Design Specifications")
        
        # Generate the prompt based on selections
        prompt = generate_international_prompt(
            category, silhouette, fabrics, color, neckline, sleeves, length, details, vibe, cultural_influence
        )
        
        # Display the prompt in a more readable format
        st.info("**Fashion Prompt:**")
        for line in prompt:
            if line:  # Only display non-empty lines
                st.write(f"• {line}")
        
        if generate_btn:
            with st.spinner("Creating your international fashion design..."):
                # Simulate generation time
                time.sleep(2)
                
                # Generate the image
                dominant_color = color if color else random.choice(COLORS)
                generated_image = generate_fashion_image(prompt, dominant_color, cultural_influence)
                
                # Store in session state
                st.session_state.generated_image = generated_image
                st.session_state.prompt = prompt
                st.session_state.cultural_influence = cultural_influence
    
    with col2:
        st.subheader("Generated Design")
        
        if 'generated_image' in st.session_state:
            # Display the generated image
            fig, ax = plt.subplots(figsize=(6, 8))
            ax.imshow(st.session_state.generated_image)
            ax.axis('off')
            influence = st.session_state.cultural_influence if 'cultural_influence' in st.session_state else "International"
            ax.set_title(f"{influence} Fashion Design", fontsize=16, pad=20)
            st.pyplot(fig)
            
            st.success("Fashion design generated successfully!")
            
            # Add download button (placeholder)
            st.download_button(
                label="Download Design",
                data="https://via.placeholder.com/300x450/808080/FFFFFF?text=Design+Preview",
                file_name="international_design.png",
                mime="image/png"
            )
        else:
            st.info("Configure your design in the sidebar and click generate to create a fashion design")
            # Placeholder image
            st.image("https://via.placeholder.com/300x450/FFFFFF/808080?text=Global+Fashion", 
                     caption="Your generated design will appear here", use_column_width=True)

    # Add information about international fashion
    st.markdown("---")
    st.subheader("About Global Fashion")
    
    col3, col4 = st.columns([1, 1])
    
    with col3:
        st.markdown("""
        **African Fashion Diversity**
        
        Africa boasts incredibly diverse fashion traditions across its regions:
        
        - **West Africa**: Known for vibrant Ankara prints, Kente cloth, and Adire dyeing techniques
        - **East Africa**: Features Kangas, Kitenges, and elegant white embroidery traditions
        - **Southern Africa**: Celebrated for Ndebele geometric patterns and Shweshwe fabric
        - **North Africa**: Renowned for intricate embroidery, caftans, and Berber influences
        - **Central Africa**: Famous for Raffia textiles and Kuba cloth designs
        """)
    
    with col4:
        st.markdown("""
        **Global Fashion Exchange**
        
        Fashion has always been a form of cultural exchange:
        
        - Traditional techniques meeting contemporary design
        - Sustainable and ethical production methods
        - Celebration of diversity in aesthetics
        - Respectful cultural appreciation
        
        This generator allows you to explore these diverse influences
        while creating unique, culturally-informed fashion pieces.
        """)
    
    # Add a footer with cultural appreciation note
    st.markdown("---")
    st.caption("""
    Note: This tool is designed for cultural appreciation and education. 
    When drawing inspiration from specific cultural traditions, we encourage 
    research into their significance and context, and support for artisans 
    from those cultures when possible.
    """)

if __name__ == "__main__":
    main()