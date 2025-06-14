-- Migration: Add owners RLS policy to listings table
-- Run this after owner_listings table is created

CREATE POLICY "Owners can view their own listings"
ON public.listings FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1
    FROM public.owner_listings ol
    JOIN public.owners o ON ol.owner_id = o.id
    WHERE ol.listing_id = listings.id
    AND o.profile_id = auth.uid()
));