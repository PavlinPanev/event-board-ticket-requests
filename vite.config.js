import { defineConfig } from 'vite';

export default defineConfig({
    root: 'src',
    envDir: '../',  // Look for .env in project root, not src/
    
    // Development server configuration
    server: {
        port: 5173,
        open: true,
        middlewareMode: false,
    },
    
    // Build configuration
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        
        // Rollup options for multi-page app
        rollupOptions: {
            // Define all HTML entry points
            input: {
                index: 'src/index.html',
                eventDetails: 'src/event-details.html',
                createEvent: 'src/create-event.html',
                myRequests: 'src/my-requests.html',
                admin: 'src/admin.html',
                login: 'src/login.html',
                register: 'src/register.html',
            },
            
            // Output configuration for organized build artifacts
            output: {
                // Entry point JS files
                entryFileNames: 'js/[name].js',
                
                // Chunk JS files (shared imports)
                chunkFileNames: 'js/[name].[hash].js',
                
                // Asset files (CSS, images, fonts)
                assetFileNames: (assetInfo) => {
                    const info = assetInfo.name.split('.');
                    const ext = info[info.length - 1];
                    
                    if (/png|jpe?g|gif|svg|webp/.test(ext)) {
                        return `images/[name].[hash][extname]`;
                    } else if (/woff|woff2|eot|ttf|otf/.test(ext)) {
                        return `fonts/[name].[hash][extname]`;
                    } else if (ext === 'css') {
                        return `css/[name].[hash][extname]`;
                    }
                    return `assets/[name].[hash][extname]`;
                }
            }
        },
    },
});
