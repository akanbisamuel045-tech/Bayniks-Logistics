'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import { ThemeToggle } from './ThemeToggle';
import {
  Home,
  Briefcase,
  Package,
  MapPin,
  ArrowLeft,
  Search,
  X,
  Pencil,
  Trash2,
  User,
  Bike,
  Crosshair,
  Map,
  Check,
  Plus,
} from 'lucide-react';

export type AddressCategory = 'home' | 'work' | 'warehouse' | 'other';

export interface SavedAddressItem {
  id: string;
  title: string;
  category: AddressCategory;
  address: string;
  landmark: string;
  contactName: string;
  phone: string;
  isDefault: boolean;
}

export interface SavedAddressesViewProps {
  initialAddresses?: SavedAddressItem[];
  onBackClick?: () => void;
  onSelectAddressForShipment?: (address: SavedAddressItem, role: 'pickup' | 'delivery') => void;
}

const DEFAULT_ADDRESSES: SavedAddressItem[] = [
  {
    id: 'addr-1',
    title: 'Home Residence',
    category: 'home',
    address: '12 Commercial Avenue, Sabo, Yaba, Lagos',
    landmark: 'Opposite Ozone Cinemas, Yaba',
    contactName: 'Kainul Stevano',
    phone: '+234 812 345 6789',
    isDefault: true,
  },
  {
    id: 'addr-2',
    title: 'Design Studio & Office',
    category: 'work',
    address: 'Plot 4, Adeola Odeku Street, Victoria Island, Lagos',
    landmark: 'Beside Zenith Bank Head Office',
    contactName: 'Kainul Designs Ltd',
    phone: '+234 803 111 2233',
    isDefault: false,
  },
  {
    id: 'addr-3',
    title: 'Ikeja Distribution Depot',
    category: 'warehouse',
    address: 'Obafemi Awolowo Way, Ikeja GRA, Lagos',
    landmark: 'Near Ikeja City Mall & Secretariat Gate',
    contactName: 'Warehouse Manager (Bayo)',
    phone: '+234 818 990 0112',
    isDefault: false,
  },
  {
    id: 'addr-4',
    title: 'Lekki Showroom & Store',
    category: 'other',
    address: 'Admiralty Way, Lekki Phase 1, Lagos',
    landmark: 'Opposite Domino Pizza Roundabout',
    contactName: 'Blessing Okon',
    phone: '+234 901 882 1100',
    isDefault: false,
  },
];

export function SavedAddressesView({
  initialAddresses = DEFAULT_ADDRESSES,
  onBackClick,
  onSelectAddressForShipment,
}: SavedAddressesViewProps) {
  const router = useRouter();
  const { isDark } = useTheme();

  const [addresses, setAddresses] = useState<SavedAddressItem[]>(initialAddresses);
  const [selectedCategory, setSelectedCategory] = useState<'all' | AddressCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State (Add or Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<AddressCategory>('home');
  const [formAddress, setFormAddress] = useState('');
  const [formLandmark, setFormLandmark] = useState('');
  const [formContactName, setFormContactName] = useState('Kainul Stevano');
  const [formPhone, setFormPhone] = useState('+234 812 345 6789');
  const [formIsDefault, setFormIsDefault] = useState(false);

  // Delete Confirmation State
  const [addressToDelete, setAddressToDelete] = useState<SavedAddressItem | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3200);
  };

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.push('/');
    }
  };

  // Open Modal for New Address
  const handleOpenAddModal = () => {
    setEditingAddressId(null);
    setFormTitle('');
    setFormCategory('home');
    setFormAddress('');
    setFormLandmark('');
    setFormContactName('Kainul Stevano');
    setFormPhone('+234 812 345 6789');
    setFormIsDefault(addresses.length === 0);
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (item: SavedAddressItem) => {
    setEditingAddressId(item.id);
    setFormTitle(item.title);
    setFormCategory(item.category);
    setFormAddress(item.address);
    setFormLandmark(item.landmark);
    setFormContactName(item.contactName);
    setFormPhone(item.phone);
    setFormIsDefault(item.isDefault);
    setIsModalOpen(true);
  };

  // Save Address (Create or Update)
  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formLandmark.trim()) {
      showToast('Mandatory landmark required for Nigerian delivery navigation');
      return;
    }

    const title = formTitle.trim() || 'Saved Location';
    const street = formAddress.trim() || 'Lagos, Nigeria';
    const landmark = formLandmark.trim();
    const contact = formContactName.trim() || 'Kainul Stevano';
    const phone = formPhone.trim() || '+234 812 345 6789';

    if (editingAddressId) {
      // Update existing
      setAddresses((prev) =>
        prev.map((item) => {
          if (item.id === editingAddressId) {
            return {
              ...item,
              title,
              category: formCategory,
              address: street,
              landmark,
              contactName: contact,
              phone,
              isDefault: formIsDefault,
            };
          }
          if (formIsDefault) {
            return { ...item, isDefault: false };
          }
          return item;
        })
      );
      showToast(`Updated "${title}" successfully!`);
    } else {
      // Add new
      const newEntry: SavedAddressItem = {
        id: `addr-${Date.now()}`,
        title,
        category: formCategory,
        address: street,
        landmark,
        contactName: contact,
        phone,
        isDefault: formIsDefault,
      };

      setAddresses((prev) => {
        const updated = formIsDefault ? prev.map((a) => ({ ...a, isDefault: false })) : [...prev];
        return [newEntry, ...updated];
      });
      showToast(`Saved "${title}" to address book!`);
    }

    setIsModalOpen(false);
    setEditingAddressId(null);
  };

  // Delete Address
  const handleConfirmDelete = () => {
    if (!addressToDelete) return;
    const deletedId = addressToDelete.id;
    setAddresses((prev) => {
      const remaining = prev.filter((a) => a.id !== deletedId);
      if (addressToDelete.isDefault && remaining.length > 0 && remaining[0]) {
        remaining[0].isDefault = true;
      }
      return remaining;
    });
    showToast(`Removed "${addressToDelete.title}" from saved addresses`);
    setAddressToDelete(null);
  };

  // Quick Dispatch: Send from here (Pickup) or Deliver here (Dropoff)
  const handleUseAddress = (item: SavedAddressItem, role: 'pickup' | 'delivery') => {
    if (onSelectAddressForShipment) {
      onSelectAddressForShipment(item, role);
    } else {
      showToast(`${role === 'pickup' ? 'Pickup' : 'Delivery'} set to ${item.title}`);
      router.push('/shipment/new');
    }
  };

  // Set default address
  const handleSetDefault = (id: string) => {
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    showToast('Default address updated');
  };

  // Filtered addresses
  const filteredAddresses = useMemo(() => {
    return addresses.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesAddress = item.address.toLowerCase().includes(q);
        const matchesLandmark = item.landmark.toLowerCase().includes(q);
        const matchesContact = item.contactName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesAddress && !matchesLandmark && !matchesContact) return false;
      }
      return true;
    });
  }, [addresses, selectedCategory, searchQuery]);

  const renderCategoryIcon = (cat: AddressCategory) => {
    switch (cat) {
      case 'home':
        return <Home className="w-5 h-5 text-emerald-600" />;
      case 'work':
        return <Briefcase className="w-5 h-5 text-sky-600" />;
      case 'warehouse':
        return <Package className="w-5 h-5 text-amber-600" />;
      case 'other':
      default:
        return <MapPin className="w-5 h-5 text-bayniks-orange" />;
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-50 text-slate-900">
      {/* Top Header */}
      <header className="px-5 py-3.5 flex items-center justify-between max-w-md w-full mx-auto shrink-0 border-b bg-white border-slate-200">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back to dashboard"
          className="w-10 h-10 rounded-full flex items-center justify-center transition active:scale-95 bg-slate-100 text-slate-800 hover:bg-slate-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h1 className="text-sm font-extrabold tracking-tight text-slate-900">Saved Addresses</h1>
          <span className="text-[10px] font-mono text-slate-500 font-bold block">
            {addresses.length} Saved Locations
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="w-9 h-9 rounded-full bg-bayniks-orange text-white flex items-center justify-center font-extrabold text-base shadow-sm hover:bg-orange-600 transition active:scale-95"
            title="Add Address"
            aria-label="Add New Address"
          >
            +
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md mx-auto px-5 py-4 space-y-4 overflow-y-auto">
        {/* Search Input */}
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search address, landmark, or contact name..."
            className="w-full text-xs font-semibold pl-10 pr-8 py-2.5 rounded-2xl border transition focus:outline-none focus:ring-1 focus:ring-bayniks-orange bg-white text-slate-900 border-slate-200 placeholder-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-xs text-slate-400 hover:text-slate-900"
              aria-label="Clear Search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-[11px] font-extrabold transition shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-bayniks-orange text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            All ({addresses.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('home')}
            className={`px-3.5 py-1.5 rounded-full text-[11px] font-extrabold transition shrink-0 flex items-center gap-1.5 ${
              selectedCategory === 'home'
                ? 'bg-bayniks-orange text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home ({addresses.filter((a) => a.category === 'home').length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('work')}
            className={`px-3.5 py-1.5 rounded-full text-[11px] font-extrabold transition shrink-0 flex items-center gap-1.5 ${
              selectedCategory === 'work'
                ? 'bg-bayniks-orange text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Work ({addresses.filter((a) => a.category === 'work').length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('warehouse')}
            className={`px-3.5 py-1.5 rounded-full text-[11px] font-extrabold transition shrink-0 flex items-center gap-1.5 ${
              selectedCategory === 'warehouse'
                ? 'bg-bayniks-orange text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Depot ({addresses.filter((a) => a.category === 'warehouse').length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('other')}
            className={`px-3.5 py-1.5 rounded-full text-[11px] font-extrabold transition shrink-0 flex items-center gap-1.5 ${
              selectedCategory === 'other'
                ? 'bg-bayniks-orange text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Others ({addresses.filter((a) => a.category === 'other').length})</span>
          </button>
        </div>

        {/* Addresses List */}
        <div className="space-y-3.5">
          {filteredAddresses.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl p-4 border transition shadow-sm bg-white border-slate-200 hover:border-bayniks-orange/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border bg-slate-100 border-slate-200 text-slate-800">
                    {renderCategoryIcon(item.category)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-extrabold text-xs truncate text-slate-900">{item.title}</h3>
                      {item.isDefault && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                      {item.address}
                    </p>
                  </div>
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center space-x-1 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(item)}
                    aria-label={`Edit ${item.title}`}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition active:scale-90"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddressToDelete(item)}
                    aria-label={`Delete ${item.title}`}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition active:scale-90"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Verified Nigerian Landmark Pill */}
              <div className="mt-2.5 px-3 py-1.5 rounded-xl border flex items-center space-x-1.5 text-[11px] bg-orange-50/80 border-orange-200 text-orange-900">
                <MapPin className="w-3.5 h-3.5 text-bayniks-orange shrink-0" />
                <span className="font-semibold truncate">Landmark: {item.landmark}</span>
              </div>

              {/* Contact info row */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400 inline" />
                  <span>{item.contactName} • <span className="font-mono text-slate-700">{item.phone}</span></span>
                </span>
                {!item.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(item.id)}
                    className="text-[10px] font-bold text-bayniks-orange hover:underline"
                  >
                    Make Default
                  </button>
                )}
              </div>

              {/* Quick 1-Tap Dispatch Triggers */}
              <div className="mt-3 pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleUseAddress(item, 'pickup')}
                  className="flex-1 py-2 px-3 rounded-xl bg-bayniks-orange hover:bg-orange-600 text-white text-[11px] font-extrabold flex items-center justify-center space-x-1.5 active:scale-95 transition shadow-sm"
                >
                  <Bike className="w-3.5 h-3.5" />
                  <span>Send from here</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUseAddress(item, 'delivery')}
                  className="flex-1 py-2 px-3 rounded-xl border text-[11px] font-extrabold flex items-center justify-center space-x-1.5 active:scale-95 transition bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Deliver here</span>
                </button>
              </div>
            </div>
          ))}

          {filteredAddresses.length === 0 && (
            <div className="py-12 text-center rounded-3xl border p-6 bg-white border-slate-200">
              <div className="w-12 h-12 rounded-full bg-bayniks-orange/15 text-bayniks-orange mx-auto flex items-center justify-center mb-3">
                <MapPin className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">No saved addresses found</h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Tap + to add your home, studio, or warehouse address.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT ADDRESS DRAWER                                          */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end transition-opacity">
          <div className="flex-1" onClick={() => setIsModalOpen(false)} />
          <div className="rounded-t-[36px] max-h-[92%] flex flex-col overflow-hidden shadow-2xl p-5 space-y-4 max-w-md w-full mx-auto bg-white text-slate-900 border-t border-slate-200">
            <div className="pt-1 pb-1 flex justify-center">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingAddressId ? 'Edit Address' : 'Add New Address'}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {editingAddressId ? 'Update Nigerian corridor navigation details' : 'Save for 1-tap dispatch & delivery'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center text-xs"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-3.5 overflow-y-auto max-h-[70vh]">
              {/* Category Picker */}
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-700">Address Category</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['home', 'work', 'warehouse', 'other'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormCategory(cat)}
                      className={`py-2 rounded-2xl border text-center transition flex flex-col items-center gap-1 ${
                        formCategory === cat
                          ? 'border-bayniks-orange bg-orange-50 text-bayniks-orange font-extrabold ring-1 ring-bayniks-orange'
                          : 'bg-slate-50 border-slate-200 text-slate-600 font-medium hover:border-slate-300'
                      }`}
                    >
                      <div className="text-base">{renderCategoryIcon(cat)}</div>
                      <span className="text-[10px] capitalize">
                        {cat === 'warehouse' ? 'Depot' : cat === 'other' ? 'Others' : cat}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Location Nickname */}
              <div>
                <label htmlFor="addressTitleInput" className="block text-xs font-bold mb-1 text-slate-700">
                  Location Nickname
                </label>
                <input
                  id="addressTitleInput"
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Home Apartment, Studio, Ikeja Depot"
                  className="w-full text-xs font-semibold px-4 py-3 rounded-2xl border bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-bayniks-orange"
                />
              </div>

              {/* Street Address */}
              <div>
                <label htmlFor="addressStreetInput" className="block text-xs font-bold mb-1 text-slate-700">
                  Street Address & Lagos Corridor
                </label>
                <input
                  id="addressStreetInput"
                  type="text"
                  required
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="e.g. 12 Commercial Avenue, Sabo, Yaba, Lagos"
                  className="w-full text-xs font-semibold px-4 py-3 rounded-2xl border bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-bayniks-orange"
                />
              </div>

              {/* Mandatory Landmark */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="addressLandmarkInput" className="block text-xs font-bold text-slate-700">
                    Nigerian Landmark (Mandatory)
                  </label>
                  <span className="text-[10px] font-mono font-bold text-bayniks-orange">REQUIRED</span>
                </div>
                <input
                  id="addressLandmarkInput"
                  type="text"
                  required
                  value={formLandmark}
                  onChange={(e) => setFormLandmark(e.target.value)}
                  placeholder="e.g. Opposite Ozone Cinemas / Beside Zenith Bank"
                  className="w-full text-xs font-semibold px-4 py-3 rounded-2xl border bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-bayniks-orange"
                />
              </div>

              {/* Contact Name & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="addressContactNameInput" className="block text-xs font-bold mb-1 text-slate-700">
                    Contact Name
                  </label>
                  <input
                    id="addressContactNameInput"
                    type="text"
                    required
                    value={formContactName}
                    onChange={(e) => setFormContactName(e.target.value)}
                    placeholder="e.g. Kainul Stevano"
                    className="w-full text-xs font-semibold px-4 py-3 rounded-2xl border bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-bayniks-orange"
                  />
                </div>
                <div>
                  <label htmlFor="addressPhoneInput" className="block text-xs font-bold mb-1 text-slate-700">
                    Phone (+234)
                  </label>
                  <input
                    id="addressPhoneInput"
                    type="tel"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+234 812 345 6789"
                    className="w-full text-xs font-mono font-bold px-4 py-3 rounded-2xl border bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-bayniks-orange"
                  />
                </div>
              </div>

              {/* Default Toggle */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="addressDefaultCheckbox"
                  checked={formIsDefault}
                  onChange={(e) => setFormIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-bayniks-orange focus:ring-bayniks-orange accent-bayniks-orange"
                />
                <label htmlFor="addressDefaultCheckbox" className="text-xs font-bold text-slate-700">
                  Set as primary default address
                </label>
              </div>

              {/* Map Picker CTA */}
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  router.push('/shipment/address-picker');
                }}
                className="w-full py-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition active:scale-95 bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              >
                <Map className="w-4 h-4 text-bayniks-orange" />
                <span>Pin Precise GPS on Lagos Radar Matrix</span>
              </button>

              {/* Save Button */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-bayniks-orange text-white text-xs font-extrabold shadow-lg shadow-bayniks-orange/30 hover:bg-orange-600 transition active:scale-95"
              >
                {editingAddressId ? 'Save Changes' : 'Save Address to Book'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE CONFIRMATION DIALOG                                         */}
      {/* ========================================================================= */}
      {addressToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="rounded-3xl p-6 max-w-sm w-full space-y-4 border shadow-2xl bg-white border-slate-200 text-slate-900">
            <div className="text-center">
              <Trash2 className="w-10 h-10 text-rose-500 mx-auto" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-extrabold text-slate-900">Delete Saved Address?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove <span className="font-bold text-slate-900">"{addressToDelete.title}"</span> from your saved addresses?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAddressToDelete(null)}
                className="py-2.5 rounded-xl border text-xs font-bold transition active:scale-95 bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-extrabold transition active:scale-95 shadow-md shadow-rose-500/30"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 max-w-sm w-full px-4 animate-bounce">
          <div className="bg-white text-slate-900 px-4 py-3 rounded-2xl shadow-2xl border border-bayniks-orange/40 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-bayniks-orange" />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-slate-900 text-xs ml-3"
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

