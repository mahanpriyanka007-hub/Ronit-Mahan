/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import { Save, X, User, Phone, MapPin } from 'lucide-react';

interface CustomerFormProps {
  editCustomer: Customer | null;
  onSaveCustomer: (customer: Customer) => void;
  onClose: () => void;
}

export default function CustomerForm({
  editCustomer,
  onSaveCustomer,
  onClose,
}: CustomerFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [milkType, setMilkType] = useState<'cow' | 'buffalo' | 'mix'>('cow');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editCustomer) {
      setName(editCustomer.name);
      setPhone(editCustomer.phone);
      setAddress(editCustomer.address);
      setMilkType(editCustomer.milkType);
      setStatus(editCustomer.status);
    } else {
      setName('');
      setPhone('');
      setAddress('');
      setMilkType('cow');
      setStatus('active');
    }
    setErrors({});
  }, [editCustomer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Customer Name is required';
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(phone.trim())) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number';
    }
    if (!address.trim()) newErrors.address = 'Address is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload: Customer = {
      id: editCustomer ? editCustomer.id : `cust_${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      milkType,
      joiningDate: editCustomer ? editCustomer.joiningDate : new Date().toISOString().split('T')[0],
      status,
    };

    onSaveCustomer(payload);
  };

  return (
    <div className="fixed inset-0 bg-[#060608]/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div 
        className="bg-[#111114] rounded-2xl border border-slate-800 w-full max-w-md overflow-hidden animate-fade-in shadow-2xl"
        id="customer-modal-dialog"
      >
        {/* Header */}
        <div className="bg-[#16161a] border-b border-slate-850 px-6 py-4 flex justify-between items-center text-white">
          <h3 className="font-bold text-lg font-sans tracking-tight text-white">
            {editCustomer ? '✏️ Edit Customer Profile' : '➕ Register New Customer'}
          </h3>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white hover:bg-slate-850 p-1.5 rounded-lg transition-colors cursor-pointer"
            id="close-customer-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-slate-300 text-sm">
          {/* Name */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Customer Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ram Singh Yadav"
                className={`w-full pl-9 pr-3 py-2.5 rounded-lg border bg-[#16161a] focus:outline-none focus:ring-1 ${
                  errors.name ? 'border-rose-500 bg-rose-500/5 focus:ring-rose-500 focus:border-rose-500' : 'border-[#1f2229] focus:ring-sky-500 focus:border-sky-500'
                }`}
                id="input-customer-name"
              />
            </div>
            {errors.name && <p className="text-xs text-rose-400 font-medium font-sans mt-1">{errors.name}</p>}
          </div>

          {/* Contact Mobile */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Mobile Number (10 digit)
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-505" />
              <input
                type="tel"
                value={phone}
                maxLength={10}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 9876543210"
                className={`w-full pl-9 pr-3 py-2.5 rounded-lg border bg-[#16161a] focus:outline-none focus:ring-1 ${
                  errors.phone ? 'border-rose-500 bg-rose-500/5 focus:ring-rose-500 focus:border-rose-500' : 'border-[#1f2229] focus:ring-sky-500 focus:border-sky-500'
                }`}
                id="input-customer-phone"
              />
            </div>
            {errors.phone && <p className="text-xs text-rose-400 font-medium font-sans mt-1">{errors.phone}</p>}
          </div>

          {/* Location/Address */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-505 uppercase tracking-wider">
              Farm Address / Village VPO
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-505" />
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. VPO Bilaspur, Farm Plot No. 15"
                rows={2}
                className={`w-full pl-9 pr-3 py-2 rounded-lg border bg-[#16161a] focus:outline-none focus:ring-1 ${
                  errors.address ? 'border-rose-500 bg-rose-500/5 focus:ring-rose-500 focus:border-rose-500' : 'border-[#1f2229] focus:ring-sky-500 focus:border-sky-500'
                }`}
                id="input-customer-address"
              />
            </div>
            {errors.address && <p className="text-xs text-rose-400 font-medium font-sans mt-1">{errors.address}</p>}
          </div>

          {/* Milk Breed Category */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Breed Milk Category Supplied
            </label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setMilkType('cow')}
                className={`py-2 px-3 rounded-lg border text-center transition-all cursor-pointer font-semibold text-xs flex flex-col items-center justify-center gap-1 ${
                  milkType === 'cow'
                    ? 'border-sky-500 bg-sky-500/10 text-white'
                    : 'border-slate-805 bg-[#16161a] hover:bg-slate-900 text-slate-400'
                }`}
                id="btn-breed-cow"
              >
                <span className="text-lg">🐄</span>
                <span>Cow Milk</span>
              </button>
              <button
                type="button"
                onClick={() => setMilkType('buffalo')}
                className={`py-2 px-3 rounded-lg border text-center transition-all cursor-pointer font-semibold text-xs flex flex-col items-center justify-center gap-1 ${
                  milkType === 'buffalo'
                    ? 'border-sky-500 bg-sky-500/10 text-white'
                    : 'border-slate-805 bg-[#16161a] hover:bg-slate-900 text-slate-400'
                }`}
                id="btn-breed-buffalo"
              >
                <span className="text-lg">🐃</span>
                <span>Buffalo Milk</span>
              </button>
              <button
                type="button"
                onClick={() => setMilkType('mix')}
                className={`py-2 px-3 rounded-lg border text-center transition-all cursor-pointer font-semibold text-xs flex flex-col items-center justify-center gap-1 ${
                  milkType === 'mix'
                    ? 'border-sky-500 bg-sky-500/10 text-white'
                    : 'border-slate-805 bg-[#16161a] hover:bg-slate-900 text-slate-400'
                }`}
                id="btn-breed-mix"
              >
                <span className="text-lg">🌿</span>
                <span>Mixed Breed</span>
              </button>
            </div>
          </div>

          {/* Status (Only show when editing) */}
          {editCustomer && (
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-505 uppercase tracking-wider">
                Status Condition
              </label>
              <div className="flex gap-4 mt-1 bg-[#16161a] p-2.5 rounded-lg border border-slate-850">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer text-xs font-medium hover:text-white transition-colors">
                  <input
                    type="radio"
                    name="status"
                    checked={status === 'active'}
                    onChange={() => setStatus('active')}
                    className="accent-sky-500"
                  />
                  <span>🟢 Active Supplier</span>
                </label>
                <label className="flex items-center gap-2 text-slate-305 cursor-pointer text-xs font-medium hover:text-white transition-colors">
                  <input
                    type="radio"
                    name="status"
                    checked={status === 'inactive'}
                    onChange={() => setStatus('inactive')}
                    className="accent-sky-500"
                  />
                  <span>🔴 Suspended / Inactive</span>
                </label>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex justify-end gap-3 border-t border-slate-850 pt-5 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 bg-slate-850 hover:bg-slate-800 transition-colors font-medium text-xs cursor-pointer"
              id="cancel-customer-form"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-slate-950 bg-sky-500 hover:bg-sky-400 shadow-sm transition-all font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              id="save-customer-form"
            >
              <Save className="w-4 h-4" />
              {editCustomer ? 'Update Profile' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
