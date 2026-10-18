import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface StudentQrCanvasProps {
  value: string;
  size?: number;
  className?: string;
  darkColor?: string;
  lightColor?: string;
}

export const StudentQrCanvas: React.FC<StudentQrCanvasProps> = ({
  value,
  size = 180,
  className = '',
  darkColor = '#090d16',
  lightColor = '#ffffff',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    QRCode.toCanvas(
      canvasRef.current,
      value || 'RYUK://STU/EMPTY',
      {
        width: size,
        margin: 1,
        color: {
          dark: darkColor,
          light: lightColor,
        },
        errorCorrectionLevel: 'H',
      },
      (error) => {
        if (error) {
          console.error('Error drawing QR code to canvas:', error);
        }
      }
    );
  }, [value, size, darkColor, lightColor]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`rounded-lg ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
};

export default StudentQrCanvas;
