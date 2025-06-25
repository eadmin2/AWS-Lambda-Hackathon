import { useState, useEffect, ChangeEvent } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import PageLayout from '../components/layout/PageLayout';
import Select from 'react-select';

const FACILITY_TYPES = [
  { label: 'All', value: '' },
  { label: 'Health', value: 'health' },
  { label: 'Benefits', value: 'benefits' },
  { label: 'Cemetery', value: 'cemetery' },
  { label: 'Vet Center', value: 'vet_center' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 250, 500, 1000];
const VISN_OPTIONS = Array.from({ length: 23 }, (_, i) => i + 1);
// Example services list; in a real app, fetch from API or config
const SERVICES_LIST = [
  { label: 'Primary Care', value: 'PrimaryCare' },
  { label: 'Mental Health', value: 'MentalHealthCare' },
  { label: 'Pharmacy', value: 'Pharmacy' },
  { label: 'Emergency Care', value: 'EmergencyCare' },
  { label: 'Dental', value: 'DentalServices' },
];

// Types for facility data (simplified for now)
type Facility = {
  id: string;
  attributes?: {
    name?: string;
    facilityType?: string;
    address?: {
      physical?: {
        address1?: string;
        city?: string;
        state?: string;
        zip?: string;
      };
    };
    phone?: {
      main?: string;
    };
    hours?: Record<string, string>;
    services?: Record<string, unknown>;
    website?: string;
  };
};

const FacilitiesPage = () => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState({
    state: '',
    zip: '',
    type: '',
    radius: '',
    services: [] as string[],
    mobile: false,
    visn: '',
    facilityIds: '',
    per_page: PAGE_SIZE_OPTIONS[0].toString(),
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);

  useEffect(() => {
    fetchFacilities();
    // eslint-disable-next-line
  }, [search, page]);

  const fetchFacilities = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.state) params.append('state', search.state);
      if (search.zip) params.append('zip', search.zip);
      if (search.type) params.append('type', search.type);
      if (search.zip && search.radius) {
        params.append('radius', search.radius);
      }
      if (search.services.length > 0) {
        search.services.forEach(service => params.append('services[]', service));
      }
      if (search.mobile) {
        params.append('mobile', 'true');
      }
      if (search.visn) {
        params.append('visn', search.visn);
      }
      if (search.facilityIds) {
        params.append('facilityIds', search.facilityIds);
      }
      params.append('page', String(page));
      params.append('per_page', search.per_page);
      const res = await fetch(`https://5yn5essw45.execute-api.us-east-2.amazonaws.com/prod/facilities?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load facilities.');
      const data = await res.json();
      setFacilities(data.data || []);
      setTotalPages(data.meta?.pagination?.totalPages || 1);
    } catch (e: any) {
      setError('Failed to load facilities.');
    }
    setLoading(false);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target;
    const { name, value } = target;
    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      setSearch(prev => ({ ...prev, [name]: target.checked }));
    } else {
      setSearch(prev => ({ ...prev, [name]: value }));
    }
    setPage(1);
  };

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">VA Facilities</h1>
        <form
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8"
          onSubmit={e => { e.preventDefault(); fetchFacilities(); }}
        >
          <input
            id="state"
            name="state"
            placeholder="State (e.g. CO)"
            value={search.state}
            onChange={handleInputChange}
            className="border border-gray-300 p-2 rounded-lg focus:ring-primary-500 focus:border-primary-500 w-full"
            maxLength={2}
          />
          <input
            id="zip"
            name="zip"
            placeholder="Zip Code"
            value={search.zip}
            onChange={handleInputChange}
            className="border border-gray-300 p-2 rounded-lg focus:ring-primary-500 focus:border-primary-500 w-full"
            maxLength={10}
          />
          <select
            id="facility-type"
            name="type"
            value={search.type}
            onChange={handleInputChange}
            className="border border-gray-300 p-2 rounded-lg focus:ring-primary-500 focus:border-primary-500 w-full"
          >
            {FACILITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input
            id="radius"
            name="radius"
            placeholder="Radius (mi)"
            value={search.radius}
            onChange={handleInputChange}
            className="border border-gray-300 p-2 rounded-lg focus:ring-primary-500 focus:border-primary-500 w-full"
            type="number"
            min={1}
            step="any"
          />
          <Select
            id="services"
            name="services"
            isMulti
            options={SERVICES_LIST}
            value={SERVICES_LIST.filter(opt => search.services.includes(opt.value))}
            onChange={(selected: { value: string }[] | null) => {
              setSearch(prev => ({
                ...prev,
                services: selected ? selected.map((opt: { value: string }) => opt.value) : []
              }));
              setPage(1);
            }}
            className="w-full"
            classNamePrefix="react-select"
            placeholder="Select services..."
            closeMenuOnSelect={false}
          />
          <label className="flex items-center gap-2 border border-gray-300 p-2 rounded-lg w-full bg-white">
            <input
              id="mobile"
              type="checkbox"
              name="mobile"
              checked={search.mobile}
              onChange={handleInputChange}
              className="form-checkbox h-5 w-5 text-primary-600"
            />
            <span>Mobile Only</span>
          </label>
          <select
            id="visn"
            name="visn"
            value={search.visn}
            onChange={handleInputChange}
            className="border border-gray-300 p-2 rounded-lg focus:ring-primary-500 focus:border-primary-500 w-full"
          >
            <option value="">All VISNs</option>
            {VISN_OPTIONS.map(v => <option key={v} value={v}>{`VISN ${v}`}</option>)}
          </select>
          <input
            id="facility-ids"
            name="facilityIds"
            placeholder="Facility IDs (comma separated)"
            value={search.facilityIds}
            onChange={handleInputChange}
            className="border border-gray-300 p-2 rounded-lg focus:ring-primary-500 focus:border-primary-500 w-full"
          />
          <select
            id="per-page"
            name="per_page"
            value={search.per_page}
            onChange={handleInputChange}
            className="border border-gray-300 p-2 rounded-lg focus:ring-primary-500 focus:border-primary-500 w-full"
          >
            {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size} per page</option>)}
          </select>
          <Button
            type="submit"
            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-2 rounded-lg shadow w-full"
          >
            Search
          </Button>
        </form>
        {loading ? <div className="text-center text-lg text-primary-600">Loading...</div> : error ? <div className="text-red-500 text-center">{error}</div> : (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {facilities.map(facility => (
                <Card key={facility.id} className="cursor-pointer transition-shadow hover:shadow-xl shadow-md border border-gray-200 bg-white" onClick={() => setSelectedFacility(facility)}>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-primary-800 truncate">{facility.attributes?.name || 'N/A'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600 mb-1 capitalize">{facility.attributes?.facilityType?.replace('va_', '').replace('_facility', '').replace('_', ' ') || 'N/A'}</div>
                    <div className="text-sm text-gray-700 mb-1">{facility.attributes?.address?.physical?.city || ''}{facility.attributes?.address?.physical?.city ? ', ' : ''}{facility.attributes?.address?.physical?.state || ''}</div>
                    <div className="text-sm text-gray-700">{facility.attributes?.phone?.main || ''}</div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="secondary" className="w-full" onClick={e => { e.stopPropagation(); setSelectedFacility(facility); }}>View Details</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
            <div className="flex justify-between items-center mt-10">
              <Button disabled={page === 1} onClick={() => setPage(page - 1)} variant="secondary">Previous</Button>
              <span className="text-gray-700">Page {page} of {totalPages}</span>
              <Button disabled={page === totalPages} onClick={() => setPage(page + 1)} variant="secondary">Next</Button>
            </div>
          </div>
        )}
        <Modal isOpen={!!selectedFacility} onClose={() => setSelectedFacility(null)} ariaLabelledBy="facility-modal-title">
          {selectedFacility && (
            <div className="relative max-w-lg w-full mx-auto bg-white rounded-2xl shadow-2xl p-8">
              <h2 id="facility-modal-title" className="text-2xl font-bold text-primary-800 mb-2">{selectedFacility.attributes?.name || 'N/A'}</h2>
              <div className="mb-2 text-gray-700 text-base font-medium">Type: <span className="capitalize">{selectedFacility.attributes?.facilityType?.replace('va_', '').replace('_facility', '').replace('_', ' ') || 'N/A'}</span></div>
              <div className="mb-2 text-gray-700">Address: {selectedFacility.attributes?.address?.physical?.address1 || ''}{selectedFacility.attributes?.address?.physical?.address1 ? ', ' : ''}{selectedFacility.attributes?.address?.physical?.city || ''}{selectedFacility.attributes?.address?.physical?.city ? ', ' : ''}{selectedFacility.attributes?.address?.physical?.state || ''} {selectedFacility.attributes?.address?.physical?.zip || ''}</div>
              <div className="mb-2 text-gray-700">Phone: {selectedFacility.attributes?.phone?.main || ''}</div>
              <div className="mb-2 text-gray-700">
                <span className="font-medium">Hours:</span>
                <ul className="ml-4 mt-1 list-disc text-sm">
                  {selectedFacility.attributes?.hours ? Object.entries(selectedFacility.attributes.hours).map(([day, hours]) => (
                    <li key={day} className="capitalize">{day}: {hours}</li>
                  )) : <li>N/A</li>}
                </ul>
              </div>
              <div className="mb-2 text-gray-700">
                <span className="font-medium">Services:</span> {selectedFacility.attributes?.services ? Object.keys(selectedFacility.attributes.services).join(', ') : 'N/A'}
              </div>
              {selectedFacility.attributes?.website && (
                <a href={selectedFacility.attributes.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">Website</a>
              )}
            </div>
          )}
        </Modal>
      </div>
    </PageLayout>
  );
};

export default FacilitiesPage; 