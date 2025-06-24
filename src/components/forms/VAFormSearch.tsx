import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, FileText, Download, AlertCircle, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { searchVAForms } from '../../services/vaFormsApi';
import type { VAForm, VAFormFilterState, VAFormSuggestion } from '../../../types';
import Select from 'react-select';

interface Props {
  onFormSelect: (form: VAForm) => void;
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

export function VAFormSearch({ onFormSelect }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [forms, setForms] = useState<VAForm[]>([]);
  const [sortField, setSortField] = useState<'formName' | 'lastRevisionOn'>('formName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<VAFormSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState<VAFormFilterState>({
    categories: [],
    formType: '',
    administration: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const sortedForms = [...forms].sort((a, b) => {
    if (sortField === 'formName') {
      const aName = a.attributes.form_name || '';
      const bName = b.attributes.form_name || '';
      return sortDirection === 'asc' 
        ? aName.localeCompare(bName)
        : bName.localeCompare(aName);
    } else {
      const aDate = new Date(a.attributes.last_revision_on).getTime();
      const bDate = new Date(b.attributes.last_revision_on).getTime();
      return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
    }
  });

  const toggleSort = (field: 'formName' | 'lastRevisionOn') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const generateSuggestions = useCallback((query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const commonForms = [
      { text: '21-526EZ', type: 'form_number' },
      { text: '10-10EZ', type: 'form_number' },
      { text: '21-22', type: 'form_number' },
    ] as VAFormSuggestion[];

    const commonKeywords = [
      { text: 'disability compensation', type: 'keyword' },
      { text: 'education benefits', type: 'keyword' },
      { text: 'health care', type: 'keyword' },
      { text: 'pension', type: 'keyword' },
    ] as VAFormSuggestion[];

    const commonCategories = [
      { text: 'Health Care', type: 'category' },
      { text: 'Disability', type: 'category' },
      { text: 'Education', type: 'category' },
      { text: 'Records', type: 'category' },
    ] as VAFormSuggestion[];

    const matchingSuggestions = [
      ...commonForms.filter(s => s.text.toLowerCase().includes(query.toLowerCase())),
      ...commonKeywords.filter(s => s.text.toLowerCase().includes(query.toLowerCase())),
      ...commonCategories.filter(s => s.text.toLowerCase().includes(query.toLowerCase())),
    ].slice(0, 5);

    setSuggestions(matchingSuggestions);
  }, []);

  const handleSuggestionClick = (suggestion: VAFormSuggestion) => {
    setSearchQuery(suggestion.text);
    setShowSuggestions(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const filterForms = useCallback((forms: VAForm[]) => {
    return forms.filter(form => {
      const matchesCategories = filters.categories.length === 0 || 
        form.attributes.benefit_categories.some(cat => 
          filters.categories.includes(cat.name)
        );
      
      const matchesType = !filters.formType || 
        form.attributes.form_type === filters.formType;
      
      const matchesAdmin = !filters.administration || 
        form.attributes.va_form_administration === filters.administration;

      return matchesCategories && matchesType && matchesAdmin;
    });
  }, [filters]);

  // Update the debouncedSearch to include filtering
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query) {
        setForms([]);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        if (query.length < 3) {
          setError('Please enter at least 3 characters to search');
          setForms([]);
          return;
        }

        const results = await searchVAForms(query);
        const filteredResults = filterForms(results);
        setForms(filteredResults);
      } catch (err) {
        setError('Failed to search forms. Please try again.');
        setForms([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [filterForms]
  );

  useEffect(() => {
    generateSuggestions(searchQuery);
  }, [searchQuery, generateSuggestions]);

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const handleFilterChange = (filterType: keyof VAFormFilterState, value: string | string[]) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({ categories: [], formType: '', administration: '' });
  };

  // Example options; replace with dynamic if available
  const CATEGORY_OPTIONS = [
    { label: 'Health Care', value: 'Health Care' },
    { label: 'Disability', value: 'Disability' },
    { label: 'Education', value: 'Education' },
    { label: 'Records', value: 'Records' },
    { label: 'Housing', value: 'Housing' },
    { label: 'Insurance', value: 'Insurance' },
  ];
  const FORM_TYPE_OPTIONS = [
    { label: 'All Types', value: '' },
    { label: 'Benefit', value: 'benefit' },
    { label: 'Medical', value: 'medical' },
    { label: 'Other', value: 'other' },
  ];
  const ADMIN_OPTIONS = [
    { label: 'All Administrations', value: '' },
    { label: 'VBA', value: 'VBA' },
    { label: 'VHA', value: 'VHA' },
    { label: 'NCA', value: 'NCA' },
    { label: 'Other', value: 'Other' },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="relative">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setShowSuggestions(false);
              }}
              className="block w-full pl-10 pr-3 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg sm:rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#003875] focus:border-[#003875] shadow-sm"
              placeholder="Search forms..."
              aria-label="Search VA forms"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-3 sm:py-2 border border-gray-300 shadow-sm text-base sm:text-sm font-medium rounded-lg sm:rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#003875] transition-all duration-200 ease-in-out"
            aria-expanded={showFilters}
          >
            <Filter className="h-5 w-5 mr-2" />
            Filters
            {showFilters ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
          </button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-lg py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.text}-${index}`}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left px-4 py-3 sm:py-2 hover:bg-gray-100 flex items-center space-x-3"
              >
                {suggestion.type === 'form_number' && <FileText className="h-5 w-5 sm:h-4 sm:w-4 text-gray-400" />}
                {suggestion.type === 'keyword' && <Search className="h-5 w-5 sm:h-4 sm:w-4 text-gray-400" />}
                {suggestion.type === 'category' && <Filter className="h-5 w-5 sm:h-4 sm:w-4 text-gray-400" />}
                <span className="text-base sm:text-sm">{suggestion.text}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modern Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mt-2 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Benefit Categories</label>
              <Select
                isMulti
                options={CATEGORY_OPTIONS}
                value={CATEGORY_OPTIONS.filter(opt => filters.categories.includes(opt.value))}
                onChange={selected => handleFilterChange('categories', selected.map(opt => opt.value))}
                className="w-full"
                classNamePrefix="react-select"
                placeholder="Select categories..."
                closeMenuOnSelect={false}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Form Type</label>
              <Select
                options={FORM_TYPE_OPTIONS}
                value={FORM_TYPE_OPTIONS.find(opt => opt.value === filters.formType) || FORM_TYPE_OPTIONS[0]}
                onChange={selected => {
                  if (selected) handleFilterChange('formType', selected.value);
                }}
                className="w-full"
                classNamePrefix="react-select"
                placeholder="All Types"
                isSearchable={false}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VA Administration</label>
              <Select
                options={ADMIN_OPTIONS}
                value={ADMIN_OPTIONS.find(opt => opt.value === filters.administration) || ADMIN_OPTIONS[0]}
                onChange={selected => {
                  if (selected) handleFilterChange('administration', selected.value);
                }}
                className="w-full"
                classNamePrefix="react-select"
                placeholder="All Administrations"
                isSearchable={false}
              />
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#003875]"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Results section */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#003875] border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4">
          <div className="flex items-center">
            <AlertCircle className="h-6 w-6 sm:h-5 sm:w-5 text-red-400 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-base sm:text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      ) : forms.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Mobile view */}
          <div className="sm:hidden divide-y divide-gray-200">
            {sortedForms.map((form) => (
              <div key={form.id} className="p-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold text-gray-900">{form.attributes.form_name}</h3>
                    <span className="text-sm text-gray-500 whitespace-nowrap ml-4">
                      {new Date(form.attributes.last_revision_on).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-base text-gray-700">{form.attributes.title}</p>
                </div>
                <div className="flex flex-col space-y-3">
                  <button
                    onClick={() => onFormSelect(form)}
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 border border-[#003875] text-base font-medium rounded-lg text-white bg-[#003875] hover:bg-[#002855] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#003875]"
                  >
                    View Details
                  </button>
                  <a
                    href={form.attributes.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 border border-[#003875] text-base font-medium rounded-lg text-[#003875] bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#003875]"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop view */}
          <div className="hidden sm:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('formName')}>
                    <div className="flex items-center space-x-1">
                      <span>Form Name</span>
                      {sortField === 'formName' && (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />)}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span className="block">Title</span>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('lastRevisionOn')}>
                    <div className="flex items-center space-x-1">
                      <span>Last Updated</span>
                      {sortField === 'lastRevisionOn' && (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />)}
                    </div>
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedForms.map((form) => (
                  <tr key={form.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">{form.attributes.form_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700 max-w-xl">{form.attributes.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(form.attributes.last_revision_on).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end items-center space-x-4">
                        <button
                          onClick={() => onFormSelect(form)}
                          className="inline-flex items-center px-4 py-2 border border-[#003875] text-sm font-medium rounded-md text-white bg-[#003875] hover:bg-[#002855] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#003875]"
                        >
                          View Details
                        </button>
                        <a
                          href={form.attributes.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 border border-[#003875] text-sm font-medium rounded-md text-[#003875] bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#003875]"
                        >
                          <Download className="h-5 w-5 mr-2" />
                          Download
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : searchQuery.length > 0 ? (
        <div className="text-center py-8 text-base sm:text-sm text-gray-500">No forms found matching your search criteria.</div>
      ) : null}
    </div>
  );
} 