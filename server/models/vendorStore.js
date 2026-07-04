const mongoose = require('mongoose');
const Vendor = require('./schemas/Vendor');

function formatVendor(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const id = obj._id.toString();
  return {
    id,
    ...obj,
    _id: id,
  };
}

class VendorStore {
  async addVendor(vendor) {
    const savedVendor = await Vendor.create(vendor);
    return formatVendor(savedVendor);
  }

  async getVendors(capability) {
    const query = capability ? { capability } : {};
    const vendors = await Vendor.find(query).sort({ priority: 1, createdAt: 1 });
    return vendors.map(formatVendor);
  }

  async getVendorById(capability, vendorId) {
    if (!mongoose.Types.ObjectId.isValid(vendorId)) return null;
    const vendor = await Vendor.findOne({ _id: vendorId, capability });
    return formatVendor(vendor);
  }

  async updateVendorStatus(capability, vendorId, status) {
    if (!mongoose.Types.ObjectId.isValid(vendorId)) return null;
    const vendor = await Vendor.findOneAndUpdate(
      { _id: vendorId, capability },
      { status },
      { new: true, runValidators: true }
    );
    return formatVendor(vendor);
  }
}

module.exports = new VendorStore();
