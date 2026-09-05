import os
import sys
import glob
from pathlib import Path

# Try to load dotenv if available
try:
    from dotenv import load_dotenv
    # Look for .env in root, backend, frontend
    root_dir = Path(__file__).resolve().parent.parent
    load_dotenv(root_dir / ".env")
    load_dotenv(root_dir / "backend" / ".env")
    load_dotenv(root_dir / "frontend" / ".env")
except ImportError:
    pass

try:
    import cloudinary
    import cloudinary.uploader
except ImportError:
    print("Installing cloudinary and python-dotenv...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "cloudinary", "python-dotenv"])
    import cloudinary
    import cloudinary.uploader

cloudinary_url = os.getenv("CLOUDINARY_URL")
cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
api_key = os.getenv("CLOUDINARY_API_KEY")
api_secret = os.getenv("CLOUDINARY_API_SECRET")

if cloudinary_url and not cloud_name:
    # Format: cloudinary://<api_key>:<api_secret>@<cloud_name>
    import re
    match = re.match(r"cloudinary://([^:]+):([^@]+)@(.+)", cloudinary_url.strip())
    if match:
        api_key, api_secret, cloud_name = match.groups()

if not cloud_name or not api_key or not api_secret:
    print("\n[ERROR] Missing Cloudinary Credentials!")
    print("Please ensure either CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set.")
    sys.exit(1)

cloudinary.config(
    cloud_name=cloud_name,
    api_key=api_key,
    api_secret=api_secret,
    secure=True
)

root_dir = Path(__file__).resolve().parent.parent
pdf_dir = root_dir / "frontend" / "public" / "pdfs"
pdf_files = list(pdf_dir.glob("*.pdf"))

if not pdf_files:
    print(f"No PDF files found in {pdf_dir}")
    sys.exit(0)

print(f"\n==========================================")
print(f"Cloudinary Uploader for DrillSight PDFs")
print(f"Target Cloud: {cloud_name}")
print(f"Found {len(pdf_files)} PDF files to upload")
print(f"==========================================\n")

uploaded_urls = {}

for filepath in pdf_files:
    filename = filepath.name
    size_mb = filepath.stat().st_size / (1024 * 1024)
    print(f"Uploading '{filename}' ({size_mb:.2f} MB)...")
    
    try:
        # Use raw resource_type with full filename as public_id
        res = cloudinary.uploader.upload_large(
            str(filepath),
            public_id=filename,
            folder="drill-insight-pdfs",
            resource_type="raw",
            overwrite=True
        )
        secure_url = res.get("secure_url")
        uploaded_urls[filename] = secure_url
        print(f"  ✓ Success: {secure_url}\n")
    except Exception as e:
        print(f"  ✗ Failed: {e}\n")

print("\n==========================================")
print(f"Upload Complete! {len(uploaded_urls)}/{len(pdf_files)} files uploaded.")
base_url = f"https://res.cloudinary.com/{cloud_name}/raw/upload/drill-insight-pdfs"
print(f"Your VITE_PDF_BASE_URL: {base_url}")
print(f"==========================================\n")

# Update frontend/.env with the base url
frontend_env_path = root_dir / "frontend" / ".env"
env_lines = []
if frontend_env_path.exists():
    with open(frontend_env_path, "r", encoding="utf-8") as f:
        env_lines = f.readlines()

new_lines = [line for line in env_lines if not line.startswith("VITE_PDF_BASE_URL=")]
new_lines.append(f"VITE_PDF_BASE_URL={base_url}\n")

with open(frontend_env_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print(f"Updated {frontend_env_path} with VITE_PDF_BASE_URL!")
