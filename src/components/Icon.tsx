import React from 'react';

// Define all available icon names
export type IconName =
    | 'activity' | 'airplay' | 'alert-circle' | 'alert-octagon' | 'alert-triangle'
    | 'archive' | 'arrow-down' | 'arrow-left' | 'arrow-right' | 'arrow-up'
    | 'award' | 'bar-chart' | 'bar-chart-2' | 'bell' | 'book' | 'book-open'
    | 'bookmark' | 'box' | 'briefcase' | 'calendar' | 'camera' | 'camera-off'
    | 'check' | 'check-circle' | 'check-square' | 'chevron-down' | 'chevron-left'
    | 'chevron-right' | 'chevron-up' | 'clipboard' | 'clock' | 'cloud'
    | 'code' | 'coffee' | 'columns' | 'copy' | 'credit-card' | 'database'
    | 'delete' | 'download' | 'edit' | 'edit-2' | 'edit-3' | 'eye' | 'eye-off'
    | 'file' | 'file-minus' | 'file-plus' | 'file-text' | 'filter' | 'flag'
    | 'folder' | 'folder-minus' | 'folder-plus' | 'globe' | 'grid' | 'hash'
    | 'heart' | 'help-circle' | 'home' | 'image' | 'inbox' | 'info' | 'key'
    | 'layers' | 'layout' | 'link' | 'list' | 'loader' | 'lock' | 'log-in'
    | 'log-out' | 'mail' | 'map' | 'map-pin' | 'maximize' | 'menu' | 'message-circle'
    | 'message-square' | 'mic' | 'mic-off' | 'minimize' | 'minus' | 'minus-circle'
    | 'monitor' | 'moon' | 'more-horizontal' | 'more-vertical' | 'move' | 'music'
    | 'package' | 'paperclip' | 'pause' | 'pause-circle' | 'percent' | 'phone'
    | 'pie-chart' | 'play' | 'play-circle' | 'plus' | 'plus-circle' | 'plus-square'
    | 'power' | 'printer' | 'refresh-ccw' | 'refresh-cw' | 'repeat' | 'rotate-ccw'
    | 'rotate-cw' | 'save' | 'search' | 'send' | 'server' | 'settings' | 'share'
    | 'share-2' | 'shield' | 'shopping-bag' | 'shopping-cart' | 'sidebar'
    | 'sliders' | 'smile' | 'star' | 'stop-circle' | 'sun' | 'sunrise' | 'sunset'
    | 'table' | 'tag' | 'target' | 'terminal' | 'thumbs-down' | 'thumbs-up'
    | 'toggle-left' | 'toggle-right' | 'trash' | 'trash-2' | 'trending-down'
    | 'trending-up' | 'triangle' | 'truck' | 'tv' | 'type' | 'umbrella'
    | 'underline' | 'unlock' | 'upload' | 'upload-cloud' | 'user' | 'user-check'
    | 'user-minus' | 'user-plus' | 'user-x' | 'users' | 'video' | 'video-off'
    | 'volume' | 'volume-1' | 'volume-2' | 'volume-x' | 'watch' | 'wifi'
    | 'wifi-off' | 'x' | 'x-circle' | 'x-octagon' | 'x-square' | 'zap' | 'zoom-in' | 'zoom-out';

interface IconProps {
    name: IconName;
    size?: number;
    color?: string;
    strokeWidth?: number;
    className?: string;
}

// Cache for loaded SVG content
const iconCache: Record<string, string> = {};

const Icon: React.FC<IconProps> = ({
    name,
    size = 24,  // Increased default size from 20 to 24
    color = 'currentColor',
    strokeWidth = 2,
    className = ''
}) => {
    const [svgContent, setSvgContent] = React.useState<string>('');

    React.useEffect(() => {
        const loadIcon = async () => {
            // Create cache key with all relevant params
            const cacheKey = `${name}-${size}-${color}-${strokeWidth}`;

            if (iconCache[cacheKey]) {
                setSvgContent(iconCache[cacheKey]);
                return;
            }

            try {
                const response = await fetch(`/src/feather/${name}.svg`);
                const text = await response.text();

                // Parse and modify SVG attributes
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'image/svg+xml');
                const svg = doc.querySelector('svg');

                if (svg) {
                    svg.setAttribute('width', String(size));
                    svg.setAttribute('height', String(size));
                    svg.setAttribute('stroke', color);
                    svg.setAttribute('stroke-width', String(strokeWidth));
                    svg.style.minWidth = `${size}px`;
                    svg.style.minHeight = `${size}px`;

                    const content = svg.outerHTML;
                    iconCache[cacheKey] = content;
                    setSvgContent(content);
                }
            } catch (error) {
                console.error(`Error loading icon ${name}:`, error);
            }
        };

        loadIcon();
    }, [name, size, color, strokeWidth]);

    return (
        <span
            className={`feather-icon ${className}`}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: size,
                height: size,
                minWidth: size,
                minHeight: size,
                color: color,
                flexShrink: 0
            }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
        />
    );
};

export default Icon;
