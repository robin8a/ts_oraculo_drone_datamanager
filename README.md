# S3 File Manager

A React + TypeScript + Tailwind CSS web application for managing files in AWS S3 buckets with project-based access control.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create configuration files in the `public/` folder (see `public/config.json.example` and `public/users_auth.json.example` for templates):

   - `public/config.json` - AWS S3 configuration:
   ```json
   {
     "bucket": "your-s3-bucket-name",
     "accessKey": "your-aws-access-key",
     "secretKey": "your-aws-secret-key"
   }
   ```

   - `public/users_auth.json` - User authentication (array format):
   ```json
   [
     {
       "username": "username",
       "password": "password",
       "project_ids": [
         "project_id_1",
         "project_id_2",
         "project_id_3"
       ]
     }
   ]
   ```

3. Start the development server:
```bash
npm run dev
```

## Features

- User authentication with project-based access
- File and folder management in S3 buckets
- Upload, download, delete, rename files
- Copy, move, and paste operations
- Create and delete folders
- Project-based file filtering
- Modern UI with Tailwind CSS

## Project Structure

- Files are organized by project ID in S3: `project_id_1/file.txt`
- Users can only access files from their assigned project IDs
- Config files are gitignored for security

## Build

```bash
npm run build
```

## Preview

```bash
npm run preview
```
