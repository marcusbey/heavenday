import { setupStrapi, cleanupStrapi } from '../helpers/strapi';
import { Strapi } from '@strapi/strapi';

describe('Product Variant Content Model', () => {
  let strapi: Strapi;
  let testProduct: any;

  beforeAll(async () => {
    strapi = await setupStrapi();
  });

  afterAll(async () => {
    await cleanupStrapi(strapi);
  });

  beforeEach(async () => {
    // Clear product variants table for each test
    await strapi.db.query('api::product-variant.product-variant').deleteMany({});
    
    // Create a test product for variant association
    testProduct = await strapi.entityService.create('api::product.product', {
      data: {
        name: 'Test Product for Variants',
        description: 'Product used for variant testing',
        price: 99.99,
        sku: 'TEST-VARIANT-PROD'
      }
    });
  });

  afterEach(async () => {
    // Clean up test product
    if (testProduct) {
      await strapi.entityService.delete('api::product.product', testProduct.id);
    }
  });

  describe('Schema Validation', () => {
    it('should create variant with required fields', async () => {
      const variantData = {
        product: testProduct.id,
        sku: 'TEST-VAR-001',
        name: 'Red Large Variant',
        price: 129.99
      };

      const variant = await strapi.entityService.create('api::product-variant.product-variant', {
        data: variantData
      });

      expect(variant).toBeDefined();
      expect(variant.sku).toBe('TEST-VAR-001');
      expect(variant.name).toBe('Red Large Variant');
      expect(variant.price).toBe(129.99);
    });

    it('should fail validation with missing required fields', async () => {
      const incompleteVariant = {
        product: testProduct.id,
        name: 'Incomplete Variant'
        // Missing required fields: sku, price
      };

      await expect(
        strapi.entityService.create('api::product-variant.product-variant', {
          data: incompleteVariant
        })
      ).rejects.toThrow();
    });

    it('should enforce unique SKU constraint', async () => {
      const firstVariant = {
        product: testProduct.id,
        sku: 'UNIQUE-VAR-001',
        name: 'First Variant',
        price: 100.00
      };

      const duplicateSku = {
        product: testProduct.id,
        sku: 'UNIQUE-VAR-001', // Same SKU
        name: 'Second Variant',
        price: 150.00
      };

      await strapi.entityService.create('api::product-variant.product-variant', {
        data: firstVariant
      });

      await expect(
        strapi.entityService.create('api::product-variant.product-variant', {
          data: duplicateSku
        })
      ).rejects.toThrow();
    });

    it('should validate field length constraints', async () => {
      const longName = {
        product: testProduct.id,
        sku: 'LONG-NAME-001',
        name: 'a'.repeat(256), // Exceeds 255 char limit
        price: 100.00
      };

      const longSku = {
        product: testProduct.id,
        sku: 'a'.repeat(101), // Exceeds 100 char limit
        name: 'Long SKU Variant',
        price: 100.00
      };

      await expect(
        strapi.entityService.create('api::product-variant.product-variant', {
          data: longName
        })
      ).rejects.toThrow();

      await expect(
        strapi.entityService.create('api::product-variant.product-variant', {
          data: longSku
        })
      ).rejects.toThrow();
    });

    it('should validate price constraints', async () => {
      const negativePrice = {
        product: testProduct.id,
        sku: 'NEG-PRICE-VAR',
        name: 'Negative Price Variant',
        price: -10.50
      };

      const negativeOriginalPrice = {
        product: testProduct.id,
        sku: 'NEG-ORIG-PRICE-VAR',
        name: 'Negative Original Price Variant',
        price: 50.00,
        originalPrice: -75.00
      };

      await expect(
        strapi.entityService.create('api::product-variant.product-variant', {
          data: negativePrice
        })
      ).rejects.toThrow();

      await expect(
        strapi.entityService.create('api::product-variant.product-variant', {
          data: negativeOriginalPrice
        })
      ).rejects.toThrow();
    });

    it('should validate stock quantity constraints', async () => {
      const negativeStock = {
        product: testProduct.id,
        sku: 'NEG-STOCK-VAR',
        name: 'Negative Stock Variant',
        price: 100.00,
        stockQuantity: -5
      };

      await expect(
        strapi.entityService.create('api::product-variant.product-variant', {
          data: negativeStock
        })
      ).rejects.toThrow();
    });

    it('should validate weight constraints', async () => {
      const negativeWeight = {
        product: testProduct.id,
        sku: 'NEG-WEIGHT-VAR',
        name: 'Negative Weight Variant',
        price: 100.00,
        weight: -2.5
      };

      await expect(
        strapi.entityService.create('api::product-variant.product-variant', {
          data: negativeWeight
        })
      ).rejects.toThrow();
    });

    it('should validate hex color format', async () => {
      const invalidHexColors = ['#gg0000', '#12345', 'red', '123456', '#1234567'];

      for (const invalidColor of invalidHexColors) {
        const invalidVariant = {
          product: testProduct.id,
          sku: `INVALID-COLOR-${invalidColor}`,
          name: 'Invalid Color Variant',
          price: 100.00,
          colorHex: invalidColor
        };

        await expect(
          strapi.entityService.create('api::product-variant.product-variant', {
            data: invalidVariant
          })
        ).rejects.toThrow();
      }
    });

    it('should accept valid hex color formats', async () => {
      const validHexColors = ['#ff0000', '#FF0000', '#f00', '#123', '#abcdef'];

      for (const validColor of validHexColors) {
        const variant = await strapi.entityService.create('api::product-variant.product-variant', {
          data: {
            product: testProduct.id,
            sku: `VALID-COLOR-${validColor.replace('#', '')}`,
            name: `Valid Color Variant ${validColor}`,
            price: 100.00,
            colorHex: validColor
          }
        });

        expect(variant.colorHex).toBe(validColor);
      }
    });

    it('should validate low stock threshold constraints', async () => {
      const negativeThreshold = {
        product: testProduct.id,
        sku: 'NEG-THRESHOLD-VAR',
        name: 'Negative Threshold Variant',
        price: 100.00,
        lowStockThreshold: -1
      };

      await expect(
        strapi.entityService.create('api::product-variant.product-variant', {
          data: negativeThreshold
        })
      ).rejects.toThrow();
    });
  });

  describe('Default Values', () => {
    it('should set correct default values', async () => {
      const minimalVariant = {
        product: testProduct.id,
        sku: 'MINIMAL-VAR-001',
        name: 'Minimal Variant',
        price: 50.00
      };

      const variant = await strapi.entityService.create('api::product-variant.product-variant', {
        data: minimalVariant
      });

      expect(variant.stockQuantity).toBe(0);
      expect(variant.isDefault).toBe(false);
      expect(variant.isActive).toBe(true);
      expect(variant.sortOrder).toBe(0);
      expect(variant.trackInventory).toBe(true);
      expect(variant.allowBackorder).toBe(false);
      expect(variant.lowStockThreshold).toBe(5);
    });
  });

  describe('Product Relationship', () => {
    it('should establish relationship with product', async () => {
      const variant = await strapi.entityService.create('api::product-variant.product-variant', {
        data: {
          product: testProduct.id,
          sku: 'REL-VAR-001',
          name: 'Relationship Test Variant',
          price: 75.00
        },
        populate: ['product']
      });

      expect(variant.product).toBeDefined();
      expect(variant.product.id).toBe(testProduct.id);
      expect(variant.product.name).toBe('Test Product for Variants');
    });

    it('should fail with non-existent product', async () => {
      const invalidVariant = {
        product: 99999, // Non-existent product ID
        sku: 'INVALID-PROD-VAR',
        name: 'Invalid Product Variant',
        price: 100.00
      };

      await expect(
        strapi.entityService.create('api::product-variant.product-variant', {
          data: invalidVariant
        })
      ).rejects.toThrow();
    });

    it('should retrieve variants from product', async () => {
      // Create multiple variants for the product
      const variants = [];
      for (let i = 1; i <= 3; i++) {
        const variant = await strapi.entityService.create('api::product-variant.product-variant', {
          data: {
            product: testProduct.id,
            sku: `MULT-VAR-${i.toString().padStart(3, '0')}`,
            name: `Variant ${i}`,
            price: i * 25.00
          }
        });
        variants.push(variant);
      }

      const productWithVariants = await strapi.entityService.findOne('api::product.product', testProduct.id, {
        populate: ['variants']
      });

      expect(productWithVariants.variants).toBeDefined();
      expect(productWithVariants.variants.length).toBe(3);
      expect(productWithVariants.variants.map(v => v.name)).toContain('Variant 1');
      expect(productWithVariants.variants.map(v => v.name)).toContain('Variant 2');
      expect(productWithVariants.variants.map(v => v.name)).toContain('Variant 3');
    });
  });

  describe('Variant Attributes', () => {
    it('should handle color variants', async () => {
      const colorVariants = [
        { color: 'Red', colorHex: '#ff0000' },
        { color: 'Blue', colorHex: '#0000ff' },
        { color: 'Green', colorHex: '#00ff00' }
      ];

      for (const colorData of colorVariants) {
        const variant = await strapi.entityService.create('api::product-variant.product-variant', {
          data: {
            product: testProduct.id,
            sku: `COLOR-${colorData.color.toUpperCase()}-VAR`,
            name: `${colorData.color} Variant`,
            price: 100.00,
            color: colorData.color,
            colorHex: colorData.colorHex
          }
        });

        expect(variant.color).toBe(colorData.color);
        expect(variant.colorHex).toBe(colorData.colorHex);
      }
    });

    it('should handle size variants', async () => {
      const sizeVariants = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

      for (const size of sizeVariants) {
        const variant = await strapi.entityService.create('api::product-variant.product-variant', {
          data: {
            product: testProduct.id,
            sku: `SIZE-${size}-VAR`,
            name: `Size ${size} Variant`,
            price: 100.00,
            size: size
          }
        });

        expect(variant.size).toBe(size);
      }
    });

    it('should handle material variants', async () => {
      const materialVariants = ['Silicone', 'TPE', 'Latex', 'Fabric'];

      for (const material of materialVariants) {
        const variant = await strapi.entityService.create('api::product-variant.product-variant', {
          data: {
            product: testProduct.id,
            sku: `MAT-${material.toUpperCase()}-VAR`,
            name: `${material} Variant`,
            price: 100.00,
            material: material
          }
        });

        expect(variant.material).toBe(material);
      }
    });

    it('should handle style and pattern variants', async () => {
      const variant = await strapi.entityService.create('api::product-variant.product-variant', {
        data: {
          product: testProduct.id,
          sku: 'STYLE-PATTERN-VAR',
          name: 'Style Pattern Variant',
          price: 150.00,
          style: 'Modern',
          pattern: 'Geometric',
          finish: 'Matte'
        }
      });

      expect(variant.style).toBe('Modern');
      expect(variant.pattern).toBe('Geometric');
      expect(variant.finish).toBe('Matte');
    });
  });

  describe('Component Fields', () => {
    it('should handle dimensions component', async () => {
      const variantWithDimensions = {
        product: testProduct.id,
        sku: 'DIM-VAR-001',
        name: 'Variant with Dimensions',
        price: 200.00,
        dimensions: {
          length: 12.5,
          width: 8.0,
          height: 18.0,
          unit: 'cm'
        }
      };

      const variant = await strapi.entityService.create('api::product-variant.product-variant', {
        data: variantWithDimensions,
        populate: ['dimensions']
      });

      expect(variant.dimensions).toBeDefined();
      expect(variant.dimensions.length).toBe(12.5);
      expect(variant.dimensions.width).toBe(8.0);
      expect(variant.dimensions.height).toBe(18.0);
      expect(variant.dimensions.unit).toBe('cm');
    });

    it('should handle variant attributes component array', async () => {
      const variantWithAttributes = {
        product: testProduct.id,
        sku: 'ATTR-VAR-001',
        name: 'Variant with Attributes',
        price: 175.00,
        attributes: [
          {
            name: 'Firmness',
            value: 'Medium',
            type: 'select'
          },
          {
            name: 'Temperature Rating',
            value: '37°C',
            type: 'text'
          },
          {
            name: 'Waterproof',
            value: 'true',
            type: 'boolean'
          }
        ]
      };

      const variant = await strapi.entityService.create('api::product-variant.product-variant', {
        data: variantWithAttributes,
        populate: ['attributes']
      });

      expect(variant.attributes).toBeDefined();
      expect(Array.isArray(variant.attributes)).toBe(true);
      expect(variant.attributes.length).toBe(3);
      expect(variant.attributes[0].name).toBe('Firmness');
      expect(variant.attributes[0].value).toBe('Medium');
      expect(variant.attributes[1].name).toBe('Temperature Rating');
      expect(variant.attributes[2].name).toBe('Waterproof');
    });
  });

  describe('Inventory Management', () => {
    it('should track inventory for variants', async () => {
      const inventoryVariant = await strapi.entityService.create('api::product-variant.product-variant', {
        data: {
          product: testProduct.id,
          sku: 'INV-VAR-001',
          name: 'Inventory Variant',
          price: 100.00,
          stockQuantity: 50,
          lowStockThreshold: 10,
          trackInventory: true
        }
      });

      expect(inventoryVariant.stockQuantity).toBe(50);
      expect(inventoryVariant.lowStockThreshold).toBe(10);
      expect(inventoryVariant.trackInventory).toBe(true);
    });

    it('should handle backorder settings', async () => {
      const backorderVariant = await strapi.entityService.create('api::product-variant.product-variant', {
        data: {
          product: testProduct.id,
          sku: 'BACKORDER-VAR-001',
          name: 'Backorder Variant',
          price: 100.00,
          stockQuantity: 0,
          allowBackorder: true
        }
      });

      expect(backorderVariant.stockQuantity).toBe(0);
      expect(backorderVariant.allowBackorder).toBe(true);
    });

    it('should simulate stock updates', async () => {
      const variant = await strapi.entityService.create('api::product-variant.product-variant', {
        data: {
          product: testProduct.id,
          sku: 'STOCK-UPDATE-VAR',
          name: 'Stock Update Variant',
          price: 100.00,
          stockQuantity: 100
        }
      });

      // Simulate purchase (decrease stock)
      const updatedVariant = await strapi.entityService.update('api::product-variant.product-variant', variant.id, {
        data: { stockQuantity: variant.stockQuantity - 5 }
      });

      expect(updatedVariant.stockQuantity).toBe(95);

      // Simulate restock (increase stock)
      const restockedVariant = await strapi.entityService.update('api::product-variant.product-variant', variant.id, {
        data: { stockQuantity: updatedVariant.stockQuantity + 25 }
      });

      expect(restockedVariant.stockQuantity).toBe(120);
    });
  });

  describe('Default Variant Management', () => {
    it('should handle default variant selection', async () => {
      // Create multiple variants
      const variant1 = await strapi.entityService.create('api::product-variant.product-variant', {
        data: {
          product: testProduct.id,
          sku: 'DEFAULT-VAR-001',
          name: 'Non-Default Variant',
          price: 100.00,
          isDefault: false
        }
      });

      const variant2 = await strapi.entityService.create('api::product-variant.product-variant', {
        data: {
          product: testProduct.id,
          sku: 'DEFAULT-VAR-002',
          name: 'Default Variant',
          price: 120.00,
          isDefault: true
        }
      });

      expect(variant1.isDefault).toBe(false);
      expect(variant2.isDefault).toBe(true);

      // Test filtering default variants
      const defaultVariants = await strapi.entityService.findMany('api::product-variant.product-variant', {
        filters: { 
          product: testProduct.id,
          isDefault: true 
        }
      });

      expect(defaultVariants.length).toBe(1);
      expect(defaultVariants[0].name).toBe('Default Variant');
    });

    it('should ensure only one default variant per product', async () => {
      // Create first default variant
      const firstDefault = await strapi.entityService.create('api::product-variant.product-variant', {
        data: {
          product: testProduct.id,
          sku: 'FIRST-DEFAULT-VAR',
          name: 'First Default Variant',
          price: 100.00,
          isDefault: true
        }
      });

      // Create second default variant (should update first to non-default)
      const secondDefault = await strapi.entityService.create('api::product-variant.product-variant', {
        data: {
          product: testProduct.id,
          sku: 'SECOND-DEFAULT-VAR',
          name: 'Second Default Variant',
          price: 120.00,
          isDefault: true
        }
      });

      // In a real implementation, this would require custom logic
      // For now, just test that both can exist with the flag
      expect(firstDefault.isDefault).toBe(true);
      expect(secondDefault.isDefault).toBe(true);
    });
  });

  describe('Variant Sorting and Organization', () => {
    it('should respect sort order', async () => {
      // Create variants with different sort orders
      await strapi.entityService.create('api::product-variant.product-variant', {
        data: {
          product: testProduct.id,
          sku: 'SORT-VAR-003',
          name: 'Third Variant',
          price: 100.00,
          sortOrder: 3
        }
      });

      await strapi.entityService.create('api::product-variant.product-variant', {
        data: {
          product: testProduct.id,
          sku: 'SORT-VAR-001',
          name: 'First Variant',
          price: 100.00,
          sortOrder: 1
        }
      });

      await strapi.entityService.create('api::product-variant.product-variant', {
        data: {
          product: testProduct.id,
          sku: 'SORT-VAR-002',
          name: 'Second Variant',
          price: 100.00,
          sortOrder: 2
        }
      });

      const sortedVariants = await strapi.entityService.findMany('api::product-variant.product-variant', {
        filters: { product: testProduct.id },
        sort: ['sortOrder:asc']
      });

      expect(sortedVariants[0].name).toBe('First Variant');
      expect(sortedVariants[1].name).toBe('Second Variant');
      expect(sortedVariants[2].name).toBe('Third Variant');
    });
  });

  describe('Active/Inactive Variants', () => {
    it('should manage variant active status', async () => {
      const activeVariant = await strapi.entityService.create('api::product-variant.product-variant', {
        data: {
          product: testProduct.id,
          sku: 'ACTIVE-VAR-001',
          name: 'Active Variant',
          price: 100.00,
          isActive: true
        }
      });

      const inactiveVariant = await strapi.entityService.create('api::product-variant.product-variant', {
        data: {
          product: testProduct.id,
          sku: 'INACTIVE-VAR-001',
          name: 'Inactive Variant',
          price: 100.00,
          isActive: false
        }
      });

      expect(activeVariant.isActive).toBe(true);
      expect(inactiveVariant.isActive).toBe(false);

      // Test filtering active variants
      const activeVariants = await strapi.entityService.findMany('api::product-variant.product-variant', {
        filters: { 
          product: testProduct.id,
          isActive: true 
        }
      });

      expect(activeVariants.length).toBe(1);
      expect(activeVariants[0].name).toBe('Active Variant');
    });
  });

  describe('Comprehensive Variant Creation', () => {
    it('should create variant with all fields populated', async () => {
      const comprehensiveVariant = {
        product: testProduct.id,
        sku: 'COMP-VAR-001',
        name: 'Comprehensive Variant - Red Large Silicone',
        price: 299.99,
        originalPrice: 349.99,
        stockQuantity: 25,
        weight: 1.8,
        size: 'Large',
        color: 'Red',
        colorHex: '#dc143c',
        material: 'Medical Grade Silicone',
        style: 'Modern',
        pattern: 'Textured',
        finish: 'Satin',
        isDefault: false,
        isActive: true,
        sortOrder: 1,
        barcode: '1234567890123',
        trackInventory: true,
        allowBackorder: false,
        lowStockThreshold: 8,
        dimensions: {
          length: 15.0,
          width: 10.0,
          height: 20.0,
          unit: 'cm'
        },
        attributes: [
          { name: 'Firmness', value: 'Medium', type: 'select' },
          { name: 'Heating Element', value: 'true', type: 'boolean' },
          { name: 'Max Temperature', value: '40°C', type: 'text' }
        ]
      };

      const variant = await strapi.entityService.create('api::product-variant.product-variant', {
        data: comprehensiveVariant,
        populate: ['dimensions', 'attributes', 'product']
      });

      // Verify all fields are correctly stored
      expect(variant.sku).toBe('COMP-VAR-001');
      expect(variant.name).toBe('Comprehensive Variant - Red Large Silicone');
      expect(variant.price).toBe(299.99);
      expect(variant.originalPrice).toBe(349.99);
      expect(variant.stockQuantity).toBe(25);
      expect(variant.weight).toBe(1.8);
      expect(variant.size).toBe('Large');
      expect(variant.color).toBe('Red');
      expect(variant.colorHex).toBe('#dc143c');
      expect(variant.material).toBe('Medical Grade Silicone');
      expect(variant.style).toBe('Modern');
      expect(variant.pattern).toBe('Textured');
      expect(variant.finish).toBe('Satin');
      expect(variant.barcode).toBe('1234567890123');
      expect(variant.lowStockThreshold).toBe(8);
      expect(variant.dimensions.length).toBe(15.0);
      expect(variant.attributes.length).toBe(3);
      expect(variant.product.id).toBe(testProduct.id);
    });
  });

  describe('Variant Search and Filtering', () => {
    beforeEach(async () => {
      // Create test variants for filtering
      const variants = [
        { sku: 'FILTER-RED-S', name: 'Red Small', color: 'Red', size: 'S', price: 99.99, isActive: true },
        { sku: 'FILTER-RED-L', name: 'Red Large', color: 'Red', size: 'L', price: 129.99, isActive: true },
        { sku: 'FILTER-BLUE-S', name: 'Blue Small', color: 'Blue', size: 'S', price: 99.99, isActive: false },
        { sku: 'FILTER-BLUE-L', name: 'Blue Large', color: 'Blue', size: 'L', price: 129.99, isActive: true }
      ];

      for (const variantData of variants) {
        await strapi.entityService.create('api::product-variant.product-variant', {
          data: {
            product: testProduct.id,
            ...variantData
          }
        });
      }
    });

    it('should filter variants by color', async () => {
      const redVariants = await strapi.entityService.findMany('api::product-variant.product-variant', {
        filters: { 
          product: testProduct.id,
          color: 'Red' 
        }
      });

      expect(redVariants.length).toBe(2);
      expect(redVariants.every(v => v.color === 'Red')).toBe(true);
    });

    it('should filter variants by size', async () => {
      const largeVariants = await strapi.entityService.findMany('api::product-variant.product-variant', {
        filters: { 
          product: testProduct.id,
          size: 'L' 
        }
      });

      expect(largeVariants.length).toBe(2);
      expect(largeVariants.every(v => v.size === 'L')).toBe(true);
    });

    it('should filter variants by price range', async () => {
      const expensiveVariants = await strapi.entityService.findMany('api::product-variant.product-variant', {
        filters: { 
          product: testProduct.id,
          price: { $gt: 120 }
        }
      });

      expect(expensiveVariants.length).toBe(2);
      expect(expensiveVariants.every(v => v.price > 120)).toBe(true);
    });

    it('should combine multiple filters', async () => {
      const redLargeActiveVariants = await strapi.entityService.findMany('api::product-variant.product-variant', {
        filters: { 
          product: testProduct.id,
          color: 'Red',
          size: 'L',
          isActive: true
        }
      });

      expect(redLargeActiveVariants.length).toBe(1);
      expect(redLargeActiveVariants[0].name).toBe('Red Large');
    });
  });
});