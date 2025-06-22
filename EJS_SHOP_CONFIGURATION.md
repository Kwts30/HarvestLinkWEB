# HarvestLink - EJS Only Configuration

## Current Setup
Your HarvestLink project is now configured to work exclusively with EJS templates for live preview.

## What's Configured

### Server Configuration
- **Static HTML Blocking**: Direct access to `.html` files is blocked
- **Automatic Redirects**: Any request to HTML files redirects to the corresponding EJS route
- **EJS Templates**: All pages are served through EJS templates in the `views/` directory

### Shop Button Behavior
- All shop buttons and links now point to `/shop` (EJS route)
- The shop route renders `views/shop.ejs` template
- No static HTML files are accessible
- Shop functionality works only through the Express server

### Available EJS Routes
- `/` - Home page (renders `views/index.ejs`)
- `/shop` - Shop page (renders `views/shop.ejs`) 
- `/login` - Login page (renders `views/login.ejs`)
- `/signup` - Signup page (renders `views/signup.ejs`)
- `/cart` - Cart page (renders `views/cart.ejs`)
- `/checkout` - Checkout page (renders `views/checkout.ejs`)
- `/contacts` - Contacts page (renders `views/contacts.ejs`)
- `/admin` - Admin dashboard (renders `views/admin.ejs`)

## How to Use

1. **Start the Server**: 
   ```bash
   npm run dev
   ```

2. **Access the Site**: 
   Open `http://localhost:3000` in your browser

3. **Use Shop Button**: 
   - Click any shop button or "Shop Now" link
   - It will navigate to `/shop` (EJS template)
   - Static HTML shop files are blocked

## Benefits
- ✅ Consistent server-side rendering
- ✅ Session management works properly
- ✅ API integration available
- ✅ Dynamic content with EJS variables
- ✅ No static HTML conflicts
- ✅ Proper authentication flow

## Testing
- Try accessing `http://localhost:3000/Shop webpage/shop.html` - should redirect to `/shop`
- Try accessing `http://localhost:3000/shop` - should show EJS template
- Shop buttons should only work with EJS routing
