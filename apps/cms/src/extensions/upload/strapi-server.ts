module.exports = (plugin) => {
  // Override the default upload behavior
  plugin.controllers.upload.upload = async (ctx) => {
    const { files } = ctx.request;
    
    // Process images with Sharp for optimization
    if (files && files.files) {
      const sharp = require('sharp');
      const processedFiles = [];
      
      for (const file of Array.isArray(files.files) ? files.files : [files.files]) {
        if (file.mimetype.startsWith('image/')) {
          try {
            // Optimize image
            const optimizedBuffer = await sharp(file.buffer || file.path)
              .resize(2000, 2000, {
                fit: 'inside',
                withoutEnlargement: true,
              })
              .jpeg({ quality: 85 })
              .png({ quality: 85 })
              .webp({ quality: 85 })
              .toBuffer();

            // Create thumbnails
            const thumbnailBuffer = await sharp(file.buffer || file.path)
              .resize(300, 300, {
                fit: 'cover',
                position: 'center',
              })
              .jpeg({ quality: 80 })
              .toBuffer();

            // Add metadata
            file.optimized = true;
            file.thumbnailGenerated = true;
            
            processedFiles.push({
              ...file,
              buffer: optimizedBuffer,
              size: optimizedBuffer.length,
            });
            
            // Store thumbnail separately if needed
            // This would require additional upload logic
          } catch (error) {
            strapi.log.error('Image optimization failed:', error);
            processedFiles.push(file);
          }
        } else {
          processedFiles.push(file);
        }
      }
      
      ctx.request.files.files = processedFiles;
    }
    
    // Call the original upload function
    return await strapi.plugins.upload.controllers.upload.upload(ctx);
  };

  // Add custom route for bulk media operations
  plugin.routes['content-api'].routes.push({
    method: 'POST',
    path: '/upload/bulk-delete',
    handler: 'upload.bulkDelete',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  });

  // Add bulk delete controller
  plugin.controllers.upload.bulkDelete = async (ctx) => {
    const { fileIds } = ctx.request.body;
    
    if (!Array.isArray(fileIds)) {
      return ctx.badRequest('fileIds must be an array');
    }

    const results = [];
    const errors = [];

    for (const fileId of fileIds) {
      try {
        await strapi.plugins.upload.services.upload.remove({ id: fileId });
        results.push({ id: fileId, deleted: true });
      } catch (error) {
        errors.push({ id: fileId, error: error.message });
      }
    }

    return ctx.send({ results, errors });
  };

  // Add media optimization service
  plugin.services['media-optimization'] = {
    async optimizeImage(file, options = {}) {
      const sharp = require('sharp');
      
      const {
        width = 2000,
        height = 2000,
        quality = 85,
        format = 'auto'
      } = options;

      try {
        let processor = sharp(file.buffer || file.path)
          .resize(width, height, {
            fit: 'inside',
            withoutEnlargement: true,
          });

        // Apply format-specific optimizations
        switch (format) {
          case 'jpeg':
            processor = processor.jpeg({ quality });
            break;
          case 'png':
            processor = processor.png({ quality });
            break;
          case 'webp':
            processor = processor.webp({ quality });
            break;
          default:
            if (file.mimetype.includes('jpeg')) {
              processor = processor.jpeg({ quality });
            } else if (file.mimetype.includes('png')) {
              processor = processor.png({ quality });
            } else if (file.mimetype.includes('webp')) {
              processor = processor.webp({ quality });
            }
        }

        const optimizedBuffer = await processor.toBuffer();
        
        return {
          buffer: optimizedBuffer,
          size: optimizedBuffer.length,
          optimized: true,
        };
      } catch (error) {
        strapi.log.error('Image optimization failed:', error);
        return file;
      }
    },

    async generateThumbnail(file, size = 300) {
      const sharp = require('sharp');
      
      try {
        const thumbnailBuffer = await sharp(file.buffer || file.path)
          .resize(size, size, {
            fit: 'cover',
            position: 'center',
          })
          .jpeg({ quality: 80 })
          .toBuffer();

        return {
          buffer: thumbnailBuffer,
          size: thumbnailBuffer.length,
          thumbnail: true,
        };
      } catch (error) {
        strapi.log.error('Thumbnail generation failed:', error);
        return null;
      }
    },

    async processProductImages(productId) {
      // Get product with images
      const product = await strapi.entityService.findOne('api::product.product', productId, {
        populate: ['images', 'mainImage'],
      });

      if (!product) return;

      // Process main image
      if (product.mainImage && !product.mainImage.optimized) {
        // Logic to reprocess and optimize main image
        strapi.log.info(`Processing main image for product ${productId}`);
      }

      // Process gallery images
      if (product.images && product.images.length > 0) {
        for (const image of product.images) {
          if (!image.optimized) {
            // Logic to reprocess and optimize gallery image
            strapi.log.info(`Processing gallery image ${image.id} for product ${productId}`);
          }
        }
      }
    },
  };

  return plugin;
};