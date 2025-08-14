import type { Specification, Material } from '@heaven-dolls/types';

interface ProductSpecificationsProps {
  specifications?: Specification[];
  materials?: Material[];
  careInstructions?: string;
}

export function ProductSpecifications({
  specifications,
  materials,
  careInstructions,
}: ProductSpecificationsProps) {
  const hasContent = specifications?.length || materials?.length || careInstructions;

  if (!hasContent) {
    return null;
  }

  return (
    <section>
      <h2 className="text-2xl font-bold mb-6">Specifications</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Technical Specifications */}
        {specifications && specifications.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Technical Details</h3>
            <div className="space-y-3">
              {specifications.map((spec) => (
                <div key={spec.id} className="flex justify-between py-2 border-b border-border/50">
                  <span className="font-medium text-muted-foreground">{spec.name}:</span>
                  <span>
                    {spec.value}
                    {spec.unit && ` ${spec.unit}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Materials */}
        {materials && materials.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Materials</h3>
            <div className="space-y-3">
              {materials.map((material) => (
                <div key={material.id} className="flex justify-between py-2 border-b border-border/50">
                  <span className="font-medium text-muted-foreground">
                    {material.name} ({material.category}):
                  </span>
                  <span>
                    {material.percentage ? `${material.percentage}%` : 'Primary'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Care Instructions */}
      {careInstructions && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Care Instructions</h3>
          <div 
            className="prose prose-sm max-w-none text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: careInstructions }}
          />
        </div>
      )}
    </section>
  );
}