/**
 * Templates professionnels pour l'export de carrousels
 * Style inspiré de Canva, Adobe Express, etc.
 */

export type CarouselTemplate = {
  id: string;
  name: string;
  description: string;
  preview: string;
  style: {
    backgroundColor: string;
    gradient?: string;
    borderRadius: number;
    padding: number;
    textShadow?: string;
    overlayOpacity?: number;
  };
  textStyles: {
    title: React.CSSProperties;
    body: React.CSSProperties;
    caption: React.CSSProperties;
  };
};

export const CAROUSEL_TEMPLATES: CarouselTemplate[] = [
  {
    id: 'minimal-white',
    name: 'Minimal Blanc',
    description: 'Design épuré et professionnel',
    preview: '🤍',
    style: {
      backgroundColor: '#ffffff',
      borderRadius: 0,
      padding: 40,
    },
    textStyles: {
      title: {
        fontFamily: "'Inter', sans-serif",
        fontSize: '48px',
        fontWeight: '800',
        color: '#000000',
        lineHeight: '1.2',
        letterSpacing: '-0.02em',
      },
      body: {
        fontFamily: "'Inter', sans-serif",
        fontSize: '24px',
        fontWeight: '500',
        color: '#333333',
        lineHeight: '1.5',
      },
      caption: {
        fontFamily: "'Inter', sans-serif",
        fontSize: '16px',
        fontWeight: '400',
        color: '#666666',
        lineHeight: '1.4',
      },
    },
  },
  {
    id: 'gradient-dark',
    name: 'Gradient Sombre',
    description: 'Style moderne avec dégradé',
    preview: '🌃',
    style: {
      backgroundColor: '#0f0f0f',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: 24,
      padding: 40,
      textShadow: '0 4px 12px rgba(0,0,0,0.4)',
    },
    textStyles: {
      title: {
        fontFamily: "'Poppins', sans-serif",
        fontSize: '52px',
        fontWeight: '700',
        color: '#ffffff',
        lineHeight: '1.2',
        textShadow: '0 4px 12px rgba(0,0,0,0.4)',
      },
      body: {
        fontFamily: "'Poppins', sans-serif",
        fontSize: '26px',
        fontWeight: '500',
        color: '#ffffff',
        lineHeight: '1.5',
        textShadow: '0 2px 8px rgba(0,0,0,0.3)',
      },
      caption: {
        fontFamily: "'Poppins', sans-serif",
        fontSize: '18px',
        fontWeight: '400',
        color: '#e0e0e0',
        lineHeight: '1.4',
      },
    },
  },
  {
    id: 'neon-vibrant',
    name: 'Néon Vibrant',
    description: 'Style TikTok avec effets néon',
    preview: '⚡',
    style: {
      backgroundColor: '#0a0a0a',
      gradient: 'radial-gradient(circle at 20% 50%, rgba(236, 72, 153, 0.2) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.2) 0%, transparent 50%)',
      borderRadius: 16,
      padding: 48,
      textShadow: '0 0 20px rgba(236, 72, 153, 0.6)',
    },
    textStyles: {
      title: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '56px',
        fontWeight: '800',
        color: '#ffffff',
        lineHeight: '1.1',
        textShadow: '0 0 20px rgba(236, 72, 153, 0.6), 0 0 40px rgba(139, 92, 246, 0.4)',
        letterSpacing: '-0.03em',
      },
      body: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '28px',
        fontWeight: '600',
        color: '#ffffff',
        lineHeight: '1.5',
        textShadow: '0 0 10px rgba(236, 72, 153, 0.4)',
      },
      caption: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '20px',
        fontWeight: '500',
        color: '#ec4899',
        lineHeight: '1.4',
        textShadow: '0 0 8px rgba(236, 72, 153, 0.5)',
      },
    },
  },
  {
    id: 'instagram-aesthetic',
    name: 'Instagram Esthétique',
    description: 'Design pastel et doux',
    preview: '🌸',
    style: {
      backgroundColor: '#fef3f4',
      gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      borderRadius: 20,
      padding: 44,
    },
    textStyles: {
      title: {
        fontFamily: "'Playfair Display', serif",
        fontSize: '50px',
        fontWeight: '700',
        color: '#2d1b2e',
        lineHeight: '1.2',
      },
      body: {
        fontFamily: "'Lora', serif",
        fontSize: '24px',
        fontWeight: '500',
        color: '#4a2c3e',
        lineHeight: '1.6',
      },
      caption: {
        fontFamily: "'Lora', serif",
        fontSize: '18px',
        fontWeight: '400',
        color: '#6b4e5e',
        lineHeight: '1.4',
      },
    },
  },
  {
    id: 'professional-blue',
    name: 'Professionnel Bleu',
    description: 'Sobre et corporate',
    preview: '💼',
    style: {
      backgroundColor: '#f8fafc',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
      borderRadius: 12,
      padding: 40,
    },
    textStyles: {
      title: {
        fontFamily: "'Montserrat', sans-serif",
        fontSize: '46px',
        fontWeight: '800',
        color: '#ffffff',
        lineHeight: '1.2',
        textShadow: '0 2px 8px rgba(0,0,0,0.2)',
      },
      body: {
        fontFamily: "'Montserrat', sans-serif",
        fontSize: '22px',
        fontWeight: '500',
        color: '#ffffff',
        lineHeight: '1.5',
        textShadow: '0 1px 4px rgba(0,0,0,0.15)',
      },
      caption: {
        fontFamily: "'Montserrat', sans-serif",
        fontSize: '16px',
        fontWeight: '400',
        color: '#e0f2fe',
        lineHeight: '1.4',
      },
    },
  },
  {
    id: 'bold-yellow',
    name: 'Audacieux Jaune',
    description: 'Énergique et captivant',
    preview: '🔥',
    style: {
      backgroundColor: '#fbbf24',
      borderRadius: 16,
      padding: 48,
    },
    textStyles: {
      title: {
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: '60px',
        fontWeight: '700',
        color: '#000000',
        lineHeight: '1.1',
        letterSpacing: '0.02em',
      },
      body: {
        fontFamily: "'Roboto', sans-serif",
        fontSize: '26px',
        fontWeight: '600',
        color: '#1f2937',
        lineHeight: '1.4',
      },
      caption: {
        fontFamily: "'Roboto', sans-serif",
        fontSize: '18px',
        fontWeight: '400',
        color: '#374151',
        lineHeight: '1.4',
      },
    },
  },
];

export function getTemplateById(id: string): CarouselTemplate | undefined {
  return CAROUSEL_TEMPLATES.find((t) => t.id === id);
}

export function getDefaultTemplate(): CarouselTemplate {
  return CAROUSEL_TEMPLATES[0]; // minimal-white
}
