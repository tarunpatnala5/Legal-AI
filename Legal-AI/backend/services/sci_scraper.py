import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

def fetch_live_judgments():
    url = "https://www.sci.gov.in/"
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
    except Exception as e:
        logger.error(f"Failed to fetch SCI homepage: {e}")
        return []

    soup = BeautifulSoup(response.content, 'html.parser')
    
    # The judgments are in the "Latest Information" or "Judgments" section.
    # Based on the text view, they seem to be in a list under a section.
    # We will look for links that contain "view-pdf" and are in the judgment/latest updates section.
    
    # We saw the link format: https://www.sci.gov.in/view-pdf/?diary_no=...
    
    judgments = []
    
    # Find all links that look like judgment PDFs
    links = soup.find_all('a', href=re.compile(r'view-pdf'))
    
    today = datetime.now()
    one_week_ago = today - timedelta(days=7)
    
    unique_links = set()

    for link in links:
        href = link.get('href')
        text = link.get_text(strip=True)
        
        if not text or href in unique_links:
            continue
            
        # Example text: 
        # S. SHAKUL HAMEED VS. TAMILNADU STATE TRANSPORT COROPRATION LIMITED - C.A. No. 70/2026 - Diary Number 8661 / 2024 - 06-Jan-2026 (Uploaded On 06-01-2026 18:14:10)
        
        # Regex to parse this
        # simple check for date first
        
        # We need to extract the date "06-Jan-2026" or "Uploaded On 06-01-2026"
        # The user wants "today to past one week".
        
        # Parse date from text
        match = re.search(r'(\d{2}-[A-Za-z]{3}-\d{4})', text)
        date_obj = None
        if match:
            date_str = match.group(1)
            try:
                date_obj = datetime.strptime(date_str, '%d-%b-%Y')
            except ValueError:
                pass
        
        if not date_obj:
            # Try parsing "Uploaded On dd-mm-yyyy"
            match_upload = re.search(r'Uploaded On (\d{2}-\d{2}-\d{4})', text)
            if match_upload:
                date_str = match_upload.group(1)
                try:
                    date_obj = datetime.strptime(date_str, '%d-%m-%Y')
                except ValueError:
                    pass
        
        # If we still don't have a date, skip or include carefully. 
        # But user asked for specific date range.
        if date_obj:
            if one_week_ago <= date_obj <= today + timedelta(days=1): # +1 just in case of timezone diffs
                 pass
            else:
                continue
        else:
             # parsing failed, maybe not a judgment entry in that format
             continue

        unique_links.add(href)
        
        # Determine Category
        category = "Other"
        if "Crl." in text or "Criminal" in text or "Crl.A." in text or "SLP(Crl)" in text:
            category = "Criminal"
        elif "C.A." in text or "Civil" in text or "SLP(C)" in text:
            category = "Civil"
            
        # Extract Titile (everything before the first dash usually)
        parts = text.split(' - ')
        title = parts[0] if parts else text
        
        if "https" not in href:
             href = "https://www.sci.gov.in" + href

        judgments.append({
            "title": title,
            "text": text,
            "link": href,
            "date": date_obj.strftime('%Y-%m-%d'),
            "category": category
        })
        
    return judgments
