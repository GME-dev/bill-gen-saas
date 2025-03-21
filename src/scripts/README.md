# Database Population Scripts

This directory contains scripts to populate the MongoDB database with initial data for the Bill Generator application.

## Prerequisites

1. Node.js (v16 or later)
2. MongoDB connection URI

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in this directory with your MongoDB connection information:
   ```
   MONGODB_URI=mongodb+srv://yourusername:yourpassword@yourcluster.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DB_NAME=bill-gen
   ```

## Running the Population Script

Run the following command to populate the database with initial data:

```
npm run populate
```

## What Does the Script Do?

The script populates the following collections with initial data:

1. **bike_models**: Adds the predefined bike models with prices and other attributes
2. **bills**: Adds sample bills for demonstration
3. **branding**: Sets up default branding configuration

If a collection already contains data, the script will skip populating that collection to avoid duplicates.

## Manual Execution

You can also run the script directly with Node.js:

```
node populateDatabase.js
```

## Data Notes

- The bike model data includes regular motorcycles and electric bicycles
- The sample bills demonstrate both cash and leasing payment types
- The default branding settings include colors, fonts, and company information 