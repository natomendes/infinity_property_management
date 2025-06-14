import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router';
import { PropertyCard } from '~/components/properties/PropertyCard';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { db } from '~/database/drizzleClient';
import { listings } from '~/database/schemas/listings-schema';
import { ownerListings } from '~/database/schemas/owners-listings';
import { owners } from '~/database/schemas/owners-schema';
import { eq, and } from 'drizzle-orm';
import type { AuthUser } from '~/lib/auth';
import type { Route } from './+types/_app.my-properties';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "My Properties - Property Management" },
    { name: "description", content: "View your properties" },
  ];
}

interface OutletContext {
  user: AuthUser;
}

export default function MyProperties() {
  const { user } = useOutletContext<OutletContext>();
  const [properties, setProperties] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchMyProperties = async () => {
      try {
        // Get properties owned by the current user
        const result = await db
          .select({
            id: listings.id,
            shortId: listings.shortId,
            internalName: listings.internalName,
            status: listings.status,
            addressCity: listings.addressCity,
            addressState: listings.addressState,
            propertyTypeId: listings.propertyTypeId,
            listingTypeId: listings.listingTypeId,
          })
          .from(listings)
          .innerJoin(ownerListings, eq(listings.id, ownerListings.listingId))
          .innerJoin(owners, eq(ownerListings.ownerId, owners.id))
          .where(eq(owners.profileId, user.id));

        setProperties(result);
      } catch (error) {
        console.error('Error fetching my properties:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyProperties();
  }, [user.id]);

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
        <h1 className="text-2xl font-bold text-gray-900">My Properties</h1>
        <Button>Request New Property</Button>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search my properties..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {filteredProperties.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">No properties found</div>
          <p className="text-gray-400">
            {searchTerm ? 'Try adjusting your search terms' : 'You don\'t have any properties assigned yet'}
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