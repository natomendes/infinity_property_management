import { useEffect, useState } from 'react';
import { PropertyCard } from '~/components/properties/PropertyCard';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { db } from '~/database/drizzleClient';
import { listings } from '~/database/schemas/listings-schema';
import type { Route } from './+types/_app.properties';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Properties - Property Management" },
    { name: "description", content: "Manage your properties" },
  ];
}

export default function Properties() {
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const result = await db.select().from(listings).limit(20);
        setProperties(result);
      } catch (error) {
        console.error('Error fetching properties:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperties();
  }, []);

  const filteredProperties = properties.filter(property =>
    property.internalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.shortId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
        <Button>Add Property</Button>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search properties..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {filteredProperties.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">No properties found</div>
          <p className="text-gray-400">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first property'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}