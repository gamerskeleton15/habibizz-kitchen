// Custom SVG icon: Cart
// Used in the navbar for the cart button

export default function CartIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 3H5L5.4 5M7 13H17L21 5H5.4M7 13L5.4 5M7 13L5.4 5M7 13L5.4 5M9 21C9.55228 21 10 20.5523 10 20C10 19.4477 9.55228 19 9 19C8.44772 19 8 19.4477 8 20C8 20.5523 8.44772 21 9 21ZM20 21C20.5523 21 21 20.5523 21 20C21 19.4477 20.5523 19 20 19C19.4477 19 19 19.4477 19 20C19 20.5523 19.4477 21 20 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}