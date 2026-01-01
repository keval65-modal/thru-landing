import React from 'react';

export const ShopFronts = () => {
  return (
    <>
      {/* Lift the shops well above the road on small screens so they stay visible */}
      <div className="absolute right-0 bottom-28 sm:bottom-32 md:bottom-36 flex items-end gap-1 md:gap-2 opacity-100 z-30 origin-bottom-right transform scale-[0.48] sm:scale-[0.6] md:scale-100 pr-2 sm:pr-4 md:pr-0">
          
         {/* Shop 1: Coffee Shop (Amber/Brown) */}
         <div className="relative w-32 h-40 md:w-40 md:h-48 bg-amber-50 rounded-t-xl border-4 border-amber-900 border-b-0 flex flex-col justify-end items-center mx-2 drop-shadow-md">
               {/* Awning */}
               <div className="absolute -top-4 w-36 md:w-44 h-8 bg-stripes-amber rounded-sm shadow-md" style={{ 
                   backgroundImage: 'repeating-linear-gradient(90deg, #d97706, #d97706 10px, #fcd34d 10px, #fcd34d 20px)' 
               }}></div>
               {/* Sign */}
               <div className="absolute top-7 md:top-8 w-20 md:w-24 h-8 bg-amber-900 rounded mb-2 flex items-center justify-center text-amber-50 font-bold text-[10px] md:text-xs tracking-wider">
                   CAFE
               </div>
               {/* Window */}
               <div className="w-24 md:w-28 h-16 md:h-20 bg-blue-100 border-4 border-amber-800 rounded-t-lg mb-3 md:mb-4 opacity-70 flex items-end justify-center overflow-hidden">
                   <div className="w-full h-1/2 bg-gradient-to-t from-black/10 to-transparent"></div>
               </div>
               <div className="w-full h-2 bg-amber-200"></div>
         </div>

         {/* Shop 2: Supermarket (Emerald/Green) - Taller */}
         <div className="relative w-48 h-56 md:w-56 md:h-64 bg-emerald-50 rounded-t-lg border-4 border-emerald-900 border-b-0 flex flex-col justify-end items-center mx-2 z-10 drop-shadow-md">
               {/* Awning */}
               <div className="absolute -top-4 w-52 md:w-60 h-8 rounded-sm shadow-md" style={{ 
                   backgroundImage: 'repeating-linear-gradient(90deg, #059669, #059669 10px, #6ee7b7 10px, #6ee7b7 20px)' 
               }}></div>
               {/* Sign */}
               <div className="absolute top-9 md:top-10 w-32 md:w-40 h-10 bg-emerald-800 rounded flex items-center justify-center text-white font-bold text-xs md:text-sm tracking-[0.18em] md:tracking-[0.2em]">
                   MARKET
               </div>
               {/* Double Doors */}
               <div className="flex gap-1 mb-0">
                   <div className="w-14 h-24 md:w-16 md:h-28 bg-blue-100 border-4 border-emerald-800 border-b-0 flex items-center justify-center">
                       <div className="w-2 h-8 bg-emerald-800/20 rounded-full"></div>
                   </div>
                   <div className="w-14 h-24 md:w-16 md:h-28 bg-blue-100 border-4 border-emerald-800 border-b-0 flex items-center justify-center">
                      <div className="w-2 h-8 bg-emerald-800/20 rounded-full"></div>
                   </div>
               </div>
         </div>

         {/* Shop 3: Bakery (Orange) */}
         <div className="relative w-28 h-36 md:w-36 md:h-40 bg-orange-50 rounded-t-xl border-4 border-orange-900 border-b-0 flex flex-col justify-end items-center mx-2 drop-shadow-md">
               {/* Awning */}
               <div className="absolute -top-4 w-32 md:w-40 h-8 rounded-t-full shadow-md" style={{ 
                   backgroundImage: 'repeating-linear-gradient(45deg, #ea580c, #ea580c 10px, #fdba74 10px, #fdba74 20px)' 
               }}></div>
               {/* Sign */}
               <div className="absolute top-6 w-20 h-20 rounded-full border-4 border-orange-200 flex items-center justify-center bg-white shadow-inner">
                    <span className="text-2xl">🥐</span>
               </div>
               {/* Window */}
               <div className="w-20 md:w-24 h-10 md:h-12 bg-blue-50 border-4 border-orange-800 rounded mb-0 mt-auto border-b-0"></div>
         </div>

       </div>
    </>
  );
};
