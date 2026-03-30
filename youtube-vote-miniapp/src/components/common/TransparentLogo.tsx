import { useEffect, useMemo, useState } from 'react';

interface TransparentLogoProps {
  src: string;
  alt: string;
  className?: string;
}

export default function TransparentLogo({ src, alt, className }: TransparentLogoProps) {
  const [processedSrc, setProcessedSrc] = useState<string | null>(null);

  useEffect(() => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = src;

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setProcessedSrc(src);
        return;
      }

      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Chroma-key for blue background without modifying original file.
        const isBlueBg = b > 120 && b > r + 18 && b > g + 18;
        if (isBlueBg) {
          data[i + 3] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      setProcessedSrc(canvas.toDataURL('image/png'));
    };

    image.onerror = () => {
      setProcessedSrc(src);
    };
  }, [src]);

  const finalSrc = useMemo(() => processedSrc ?? src, [processedSrc, src]);

  return <img src={finalSrc} alt={alt} className={className} />;
}
