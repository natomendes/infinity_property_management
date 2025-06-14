import { Card, CardContent, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface PropertyCardProps {
  property: {
    id: string;
    shortId: string;
    internalName: string;
    status: string;
    addressCity?: string;
    addressState?: string;
    propertyTypeId: string;
    listingTypeId: string;
  };
}

export function PropertyCard({ property }: PropertyCardProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'draft':
        return 'warning';
      case 'inactive':
        return 'danger';
      default:
        return 'default';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {property.internalName}
          </h3>
          <Badge variant={getStatusVariant(property.status)}>
            {property.status}
          </Badge>
        </div>
        <p className="text-sm text-gray-500">ID: {property.shortId}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Type:</span>
            <span className="font-medium">{property.propertyTypeId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Listing:</span>
            <span className="font-medium">{property.listingTypeId}</span>
          </div>
          {(property.addressCity || property.addressState) && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Location:</span>
              <span className="font-medium">
                {[property.addressCity, property.addressState].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}