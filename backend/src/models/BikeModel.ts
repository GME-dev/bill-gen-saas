import mongoose, { Document, Schema } from 'mongoose';

export interface IBikeModel extends Document {
  make: string;
  bikeModel: string;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

const BikeModelSchema = new Schema<IBikeModel>({
  make: {
    type: String,
    required: [true, 'Make is required'],
    trim: true
  },
  bikeModel: {
    type: String,
    required: [true, 'Model is required'],
    trim: true
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: [1900, 'Year must be at least 1900'],
    max: [new Date().getFullYear() + 1, 'Year cannot be in the future']
  }
}, {
  timestamps: true,
  versionKey: false
});

// Create a compound index for performance
BikeModelSchema.index({ make: 1, bikeModel: 1, year: 1 }, { unique: true });

// Create text indexes for search
BikeModelSchema.index({ make: 'text', bikeModel: 'text' });

// Add a static method to find by make and model
BikeModelSchema.statics.findByMakeModel = function(make: string, model: string) {
  return this.find({ 
    make: new RegExp(make, 'i'),
    bikeModel: new RegExp(model, 'i')
  });
};

export default mongoose.model<IBikeModel>('BikeModel', BikeModelSchema); 