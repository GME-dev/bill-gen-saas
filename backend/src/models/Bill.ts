import mongoose, { Document, Schema } from 'mongoose';

// Define interface for items in bill
interface IBillItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

// Define interface for bike info
interface IBikeInfo {
  make: string;
  model: string;
  regNumber: string;
}

// Define interface for bill document
export interface IBill extends Document {
  billNumber: string;
  customerName: string;
  customerPhone: string;
  bikeInfo: IBikeInfo;
  serviceDate: Date;
  items: IBillItem[];
  subtotal: number;
  tax: number;
  total: number;
  isPaid: boolean;
  paymentMethod: 'cash' | 'card' | 'online' | 'pending';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BillSchema = new Schema({
  billNumber: {
    type: String,
    required: true,
    unique: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  bikeInfo: {
    make: { type: String, required: true },
    model: { type: String, required: true },
    regNumber: { type: String, required: true }
  },
  serviceDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  items: [{
    description: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
    rate: { type: Number, required: true },
    amount: { type: Number, required: true }
  }],
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    required: true,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'online', 'pending'],
    default: 'pending'
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Auto-generate bill number before saving
BillSchema.pre('save', async function(this: any, next: any) {
  if (this.isNew) {
    const count = await mongoose.model('Bill').countDocuments();
    this.billNumber = `TMR${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

const Bill = mongoose.model<IBill>('Bill', BillSchema);

export default Bill; 