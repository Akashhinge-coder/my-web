"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/frontend/components/ui/Button";
import { Input } from "@/frontend/components/ui/Input";
import { Calendar, Users, Phone, User, MessageSquare, Utensils, CheckCircle2, AlertCircle, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/config/supabase/client";

export default function PublicReservationPage() {
  const params = useParams();
  const slug = params?.slug as string;
  
  const [restaurantName, setRestaurantName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [address, setAddress] = useState("");
  const [initLoading, setInitLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [settings, setSettings] = useState({ maxDays: 7, minMinutes: 30 });

  const [formData, setFormData] = useState({
    customer_name: "",
    phone: "",
    party_size: 2,
    occasion: "",
    notes: ""
  });

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const timeSlots = Array.from({ length: 26 }, (_, i) => {
    const totalMinutes = 9 * 60 + i * 30; // Start at 9:00 AM, 30 min intervals
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    const value = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    const label = `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;
    return { value, label };
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRestaurant() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("restaurants")
          .select("name, logo_url, address, max_reservation_days_in_advance, minimum_notice_minutes")
          .eq("slug", slug)
          .eq("is_active", true)
          .single();
          
        if (error || !data) {
          setNotFound(true);
        } else {
          setRestaurantName(data.name);
          setLogoUrl(data.logo_url || "");
          setAddress(data.address || "");
          setSettings({
            maxDays: data.max_reservation_days_in_advance ?? 7,
            minMinutes: data.minimum_notice_minutes ?? 30
          });
        }
      } catch (e) {
        setNotFound(true);
      } finally {
        setInitLoading(false);
      }
    }
    loadRestaurant();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!date || !time) {
      setError("Please select both a date and a time.");
      setLoading(false);
      return;
    }

    try {
      const combinedDate = new Date(`${date}T${time}:00`);
      
      const res = await fetch(`/api/v1/restaurants/${slug}/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          requested_time: combinedDate.toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Could not submit reservation request");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) {
    return (
      <div className="min-h-screen bg-[#FBF8F4] dark:bg-[#0c0e12] flex items-center justify-center transition-colors duration-300">
        <div className="w-8 h-8 border-4 border-[#C17D3C] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#FBF8F4] dark:bg-[#0c0e12] flex items-center justify-center p-6 transition-colors duration-300">
        <div className="max-w-md w-full bg-white dark:bg-[#111420] p-10 rounded-3xl shadow-xl border border-[#E2DAD0] dark:border-[#1e293b] text-center animate-fade-in-up">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-3xl font-display font-semibold text-slate-900 dark:text-white mb-3">Restaurant Not Found</h1>
          <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
            We couldn't find a restaurant matching that link. It may have been moved or is currently inactive.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#FBF8F4] dark:bg-[#0c0e12] flex flex-col items-center justify-center p-6 animate-fade-in transition-colors duration-300">
        <div className="max-w-md w-full bg-white dark:bg-[#111420] p-10 rounded-2xl shadow-xl border border-[#E2DAD0] dark:border-[#141722] text-center">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-3xl font-display font-semibold text-slate-900 dark:text-white mb-4">Request Sent!</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
            {restaurantName} is reviewing your reservation request. You will receive a confirmation message shortly. We look forward to hosting you!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF8F4] dark:bg-[#0c0e12] flex flex-col lg:flex-row transition-colors duration-300">
      
      {/* Left Side: Branding & Imagery */}
      <div className="relative w-full lg:w-[45%] xl:w-1/2 min-h-[35vh] sm:min-h-[40vh] lg:min-h-screen flex flex-col justify-center lg:justify-end p-6 sm:p-10 lg:p-16">
        <div className="absolute inset-0 z-0 bg-[#0c0e12]">
          <Image
            src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80"
            alt="Restaurant Interior"
            fill
            className="object-cover opacity-80"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30 lg:from-black/90 lg:via-black/40 lg:to-transparent" />
        </div>
        
        <div className="relative z-10 animate-fade-in-up delay-100 flex flex-col items-center text-center lg:items-start lg:text-left mt-10 lg:mt-0">
          {logoUrl ? (
            <div className="mb-4 lg:mb-6 relative w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-white/10 backdrop-blur-md p-3">
              <Image src={logoUrl} alt={restaurantName} fill className="object-contain p-2 drop-shadow-md" />
            </div>
          ) : (
            <div className="w-16 h-16 lg:w-20 lg:h-20 bg-black/30 border border-white/20 rounded-2xl flex items-center justify-center mb-4 lg:mb-6 shadow-2xl backdrop-blur-md">
              <Utensils className="w-8 h-8 lg:w-10 lg:h-10 text-white/90" />
            </div>
          )}
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-display font-bold text-white tracking-tight mb-3 lg:mb-4 drop-shadow-xl px-4 lg:px-0">
            {restaurantName}
          </h1>
          
          {address && (
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-2 lg:gap-3 text-white/90 max-w-md drop-shadow-md px-4 lg:px-0">
              <MapPin className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0 lg:mt-0.5 text-[#C17D3C]" />
              <p className="text-xs sm:text-sm lg:text-base leading-relaxed font-medium">{address}</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="w-full lg:w-[55%] xl:w-1/2 flex items-start lg:items-center justify-center p-4 sm:p-8 lg:p-12 xl:p-16 -mt-6 lg:mt-0 relative z-20">
        <div className="w-full max-w-lg relative animate-fade-in-up">
          <div className="bg-white dark:bg-[#111420] p-6 sm:p-10 lg:p-12 rounded-3xl lg:rounded-[2rem] shadow-2xl border border-[#E2DAD0]/60 dark:border-[#1e293b] transition-colors duration-300">
            <div className="mb-8 lg:mb-10 text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl font-display font-semibold text-slate-900 dark:text-white tracking-tight mb-2">
                Reserve a table
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                Fill in your details to secure your booking.
              </p>
            </div>
            
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 rounded-xl mb-8 text-sm font-medium flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Guest Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-[#C17D3C] transition-colors" />
                    <Input 
                      required 
                      value={formData.customer_name}
                      onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                      placeholder="John Doe"
                      className="h-14 pl-12 bg-slate-50 dark:bg-[#131622] border-[#E2DAD0] dark:border-[#1e293b] text-slate-900 dark:text-white rounded-xl focus-visible:ring-[#C17D3C] focus-visible:border-[#C17D3C] text-base transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Phone Number</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-[#C17D3C] transition-colors" />
                    <Input 
                      required 
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="+91 98765 43210"
                      className="h-14 pl-12 bg-slate-50 dark:bg-[#131622] border-[#E2DAD0] dark:border-[#1e293b] text-slate-900 dark:text-white rounded-xl focus-visible:ring-[#C17D3C] focus-visible:border-[#C17D3C] text-base transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Date</label>
                  <div className="relative group">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-[#C17D3C] transition-colors z-10 pointer-events-none" />
                    <Input 
                      required 
                      type="date"
                      min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                      max={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000 + settings.maxDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      onClick={(e) => {
                        try {
                          (e.target as HTMLInputElement).showPicker();
                        } catch (err) {
                          // Ignore if showPicker is unsupported
                        }
                      }}
                      onFocus={(e) => {
                        try {
                          (e.target as HTMLInputElement).showPicker();
                        } catch (err) {
                          // Ignore
                        }
                      }}
                      onKeyDown={(e) => e.preventDefault()}
                      className="h-14 pl-12 bg-slate-50 dark:bg-[#131622] border-[#E2DAD0] dark:border-[#1e293b] text-slate-900 dark:text-white rounded-xl focus-visible:ring-[#C17D3C] focus-visible:border-[#C17D3C] text-base transition-all shadow-sm cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Time</label>
                  <div className="relative group">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-[#C17D3C] transition-colors z-10 pointer-events-none" />
                    <select 
                      required 
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full h-14 pl-12 pr-4 appearance-none bg-slate-50 dark:bg-[#131622] border border-[#E2DAD0] dark:border-[#1e293b] text-slate-900 dark:text-white rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C17D3C] focus-visible:border-[#C17D3C] text-base transition-all shadow-sm"
                    >
                      <option value="" disabled>Select time</option>
                      {timeSlots.filter(slot => {
                        if (!date) return true;
                        const isToday = date === new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
                        if (!isToday) return true;
                        
                        const [h, m] = slot.value.split(':').map(Number);
                        const slotTime = new Date();
                        slotTime.setHours(h, m, 0, 0);
                        return slotTime.getTime() > new Date().getTime() + settings.minMinutes * 60000;
                      }).map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Party Size</label>
                  <div className="relative group">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-[#C17D3C] transition-colors" />
                    <Input 
                      required 
                      type="number"
                      min="1"
                      max="50"
                      value={formData.party_size}
                      onChange={(e) => setFormData({...formData, party_size: parseInt(e.target.value)})}
                      className="h-14 pl-12 bg-slate-50 dark:bg-[#131622] border-[#E2DAD0] dark:border-[#1e293b] text-slate-900 dark:text-white rounded-xl focus-visible:ring-[#C17D3C] focus-visible:border-[#C17D3C] text-base transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">Special Notes <span className="font-normal lowercase opacity-70">(Optional)</span></label>
                <div className="relative group">
                  <MessageSquare className="absolute left-4 top-4 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-[#C17D3C] transition-colors" />
                  <textarea 
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Birthday, Anniversary, Window seat preferred..."
                    className="w-full h-28 pl-12 pt-3 bg-slate-50 dark:bg-[#131622] border border-[#E2DAD0] dark:border-[#1e293b] text-slate-900 dark:text-white rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C17D3C] focus-visible:border-[#C17D3C] text-base transition-all shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-600 resize-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full h-14 text-base font-semibold rounded-xl bg-[#C17D3C] hover:bg-[#A66830] text-white transition-all shadow-lg shadow-[#C17D3C]/20 hover:shadow-[#C17D3C]/40 disabled:opacity-70 flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting Request...
                    </>
                  ) : "Request Reservation"}
                </button>
                <p className="text-center text-xs text-slate-500 dark:text-slate-500 font-medium pt-4">
                  We'll message you once your table is verified.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
