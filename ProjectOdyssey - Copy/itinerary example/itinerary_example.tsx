import React, { useState } from 'react';
import { Search, MapPin, Calendar, Users, Plus, Bell, User, Clock, Edit2, Trash2, Navigation, Camera, Coffee, Utensils,
Hotel, Plane, ChevronDown, ChevronRight, Globe, Check, X, Send, Sparkles, DollarSign, ChevronLeft, ArrowRight } from
'lucide-react';

export default function ItineraryPlanner() {
const [selectedDay, setSelectedDay] = useState(1);
const [mainTab, setMainTab] = useState('itinerary');
const [rightTab, setRightTab] = useState('destinations');
const [isEditingTitle, setIsEditingTitle] = useState(false);
const [tripTitle, setTripTitle] = useState("European Grand Tour");
const [isItineraryCollapsed, setIsItineraryCollapsed] = useState(false);
const [navbarVisible, setNavbarVisible] = useState(false);
const [searchQuery, setSearchQuery] = useState('');
const [chatMessage, setChatMessage] = useState('');

const tripInfo = {
dates: "Apr 10 - Apr 24, 2024",
travelers: 4,
days: 14,
budget: "$8,500"
};

const destinations = [
{ id: 1, name: "Eiffel Tower", location: "Paris, France", type: "Landmark", added: false },
{ id: 2, name: "Louvre Museum", location: "Paris, France", type: "Museum", added: true },
{ id: 3, name: "Colosseum", location: "Rome, Italy", type: "Landmark", added: true },
{ id: 4, name: "Vatican Museums", location: "Vatican City", type: "Museum", added: true },
{ id: 5, name: "Trevi Fountain", location: "Rome, Italy", type: "Landmark", added: false },
{ id: 6, name: "Uffizi Gallery", location: "Florence, Italy", type: "Museum", added: false },
{ id: 7, name: "Edinburgh Castle", location: "Edinburgh, UK", type: "Landmark", added: true },
{ id: 8, name: "Tower of London", location: "London, UK", type: "Landmark", added: false }
];

const chatMessages = [
{ id: 1, type: 'user', message: 'Can you suggest some activities in Paris?' },
{ id: 2, type: 'ai', message: 'Of course! Paris offers amazing experiences. I recommend visiting the Eiffel Tower at
sunset, exploring the Louvre Museum, taking a Seine River cruise, and strolling through Montmartre. Would you like me to
add any of these to your itinerary?' }
];

const itinerary = {
1: [
{ id: 1, time: "09:00", title: "Arrival at Edinburgh Airport", type: "transport", duration: "2h", icon: Plane },
{ id: 2, time: "12:00", title: "Check-in at Hotel", location: "Old Town Edinburgh", type: "hotel", icon: Hotel },
{ id: 3, time: "14:00", title: "Lunch at The Witchery", location: "Castlehill", type: "food", icon: Utensils },
{ id: 4, time: "16:00", title: "Edinburgh Castle Tour", location: "Castlehill", type: "activity", duration: "3h", icon:
Camera }
],
2: [
{ id: 5, time: "09:00", title: "Royal Mile Walking Tour", location: "Old Town", type: "activity", duration: "2h", icon:
Navigation },
{ id: 6, time: "13:00", title: "Arthur's Seat Hike", location: "Holyrood Park", type: "activity", duration: "3h", icon:
Camera }
]
};

const getIconColor = (type) => {
switch(type) {
case 'transport': return 'text-blue-600';
case 'hotel': return 'text-purple-600';
case 'food': return 'text-orange-600';
case 'activity': return 'text-green-600';
default: return 'text-gray-600';
}
};

return (
<div className="min-h-screen bg-[#F5EFE7] relative">
    {/* Collapsible Navbar */}
    <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${navbarVisible ? 'translate-y-0'
        : '-translate-y-full' }`} onMouseEnter={()=> setNavbarVisible(true)}
        >
        <header className="bg-[#F5EFE7] border-b border-black/10">
            <div className="max-w-[1800px] mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                                <span className="text-white text-sm">O</span>
                            </div>
                            <span className="text-2xl font-bold text-black">Odyssey</span>
                        </div>

                        <nav className="hidden md:flex items-center gap-6">
                            <a href="#" className="text-black/60 hover:text-black transition-colors">Home</a>
                            <a href="#"
                                className="text-black hover:text-black/70 transition-colors underline">Planner</a>
                            <a href="#" className="text-black/60 hover:text-black transition-colors">My Trips</a>
                            <a href="#" className="text-black/60 hover:text-black transition-colors">Saved places</a>
                            <a href="#" className="text-black/60 hover:text-black transition-colors">Co-Travellers</a>
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="relative p-2 hover:bg-black/5 rounded-full transition-colors">
                            <Bell className="w-5 h-5 text-black" />
                        </button>
                        <button className="p-2 hover:bg-black/5 rounded-full transition-colors">
                            <User className="w-5 h-5 text-black" />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    </div>

    {/* Navbar peek area */}
    <div className="fixed top-0 left-0 right-0 h-2 z-40 cursor-pointer" onMouseEnter={()=> setNavbarVisible(true)}
        />

        {/* Content area with padding for navbar */}
        <div className={`transition-all duration-300 ${navbarVisible ? 'pt-20' : 'pt-0' }`} onMouseLeave={()=>
            setNavbarVisible(false)}
            >
            {/* Trip Title & Main Tabs */}
            <div className="bg-white border-b border-black/10 sticky top-0 z-30">
                <div className="max-w-[1800px] mx-auto px-6 py-4">
                    {isEditingTitle ? (
                    <div className="flex items-center gap-3 mb-4">
                        <input type="text" value={tripTitle} onChange={(e)=> setTripTitle(e.target.value)}
                        className="text-2xl font-bold text-black bg-transparent border-b-2 border-black outline-none
                        flex-1"
                        autoFocus
                        />
                        <button onClick={()=> setIsEditingTitle(false)}
                            className="p-2 bg-[#4A9B7F] text-white rounded-full hover:bg-[#3d8269] transition-colors"
                            >
                            <Check className="w-4 h-4" />
                        </button>
                        <button onClick={()=> {
                            setTripTitle("European Grand Tour");
                            setIsEditingTitle(false);
                            }}
                            className="p-2 bg-gray-300 text-black rounded-full hover:bg-gray-400 transition-colors"
                            >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    ) : (
                    <div className="flex items-center gap-3 group cursor-pointer mb-4" onClick={()=>
                        setIsEditingTitle(true)}>
                        <h1 className="text-2xl font-bold text-black">{tripTitle}</h1>
                        <Edit2 className="w-4 h-4 text-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    )}

                    {/* Main Tabs */}
                    <div className="flex gap-2">
                        <button onClick={()=> setMainTab('itinerary')}
                            className={`px-6 py-2 rounded-full transition-colors ${
                            mainTab === 'itinerary' ? 'bg-[#4A9B7F] text-white' : 'bg-gray-200 text-black
                            hover:bg-gray-300'
                            }`}
                            >
                            Itinerary
                        </button>
                        <button onClick={()=> setMainTab('maps')}
                            className={`px-6 py-2 rounded-full transition-colors ${
                            mainTab === 'maps' ? 'bg-[#4A9B7F] text-white' : 'bg-gray-200 text-black hover:bg-gray-300'
                            }`}
                            >
                            Maps
                        </button>
                        <button onClick={()=> setMainTab('summaries')}
                            className={`px-6 py-2 rounded-full transition-colors ${
                            mainTab === 'summaries' ? 'bg-[#4A9B7F] text-white' : 'bg-gray-200 text-black
                            hover:bg-gray-300'
                            }`}
                            >
                            Summaries
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-[1800px] mx-auto px-6 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-240px)]">
                    {/* Left - Itinerary Box */}
                    <div className={`transition-all duration-300 ${isItineraryCollapsed ? 'lg:col-span-1'
                        : 'lg:col-span-7' }`}>
                        <div
                            className="h-full border-2 border-dashed border-black/30 rounded-2xl bg-white overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="p-4 border-b border-black/10 flex items-center justify-between bg-gray-50">
                                <div className="flex items-center gap-2">
                                    <Camera className="w-5 h-5" />
                                    <h2 className={`font-semibold text-black ${isItineraryCollapsed ? 'hidden' : 'block'
                                        }`}>Itinerary</h2>
                                </div>
                                <button onClick={()=> setIsItineraryCollapsed(!isItineraryCollapsed)}
                                    className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                                    >
                                    {isItineraryCollapsed ?
                                    <ChevronRight className="w-4 h-4" /> :
                                    <ChevronLeft className="w-4 h-4" />}
                                </button>
                            </div>

                            {!isItineraryCollapsed && (
                            <>
                                {/* Day Tabs */}
                                <div className="p-4 border-b border-black/10 overflow-x-auto">
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                                        <button key={day} onClick={()=> setSelectedDay(day)}
                                            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                                            selectedDay === day ? 'bg-black text-white' : 'bg-gray-200 text-black
                                            hover:bg-gray-300'
                                            }`}
                                            >
                                            Day {day}
                                        </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Scrollable Itinerary Content */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {itinerary[selectedDay]?.map((activity) => {
                                    const Icon = activity.icon;
                                    return (
                                    <div key={activity.id}
                                        className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-shadow">
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 w-12">
                                                <div className="flex items-center gap-1 text-black/60">
                                                    <Clock className="w-3 h-3" />
                                                    <span className="text-xs font-medium">{activity.time}</span>
                                                </div>
                                            </div>

                                            <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-white flex
                                                items-center justify-center ${getIconColor(activity.type)}`}>
                                                <Icon className="w-5 h-5" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-black mb-1">{activity.title}</h3>
                                                {activity.location && (
                                                <p className="text-xs text-black/60 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {activity.location}
                                                </p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    className="p-1.5 hover:bg-gray-200 rounded-full transition-colors">
                                                    <Edit2 className="w-3.5 h-3.5 text-black/60" />
                                                </button>
                                                <button
                                                    className="p-1.5 hover:bg-gray-200 rounded-full transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5 text-black/60" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                    })}

                                    <button
                                        className="w-full border-2 border-dashed border-black/20 rounded-xl p-6 hover:border-black/40 transition-colors flex flex-col items-center justify-center">
                                        <Plus className="w-6 h-6 text-black/40 mb-1" />
                                        <span className="text-sm text-black/60">Add Activity</span>
                                    </button>
                                </div>
                            </>
                            )}

                            {isItineraryCollapsed && (
                            <div className="flex-1 flex items-center justify-center p-2">
                                <div
                                    className="transform -rotate-90 whitespace-nowrap text-sm font-semibold text-black/60">
                                    Itinerary
                                </div>
                            </div>
                            )}
                        </div>
                    </div>

                    {/* Right - Tabbed Content */}
                    <div className={`transition-all duration-300 ${isItineraryCollapsed ? 'lg:col-span-11'
                        : 'lg:col-span-5' }`}>
                        <div className="h-full bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col">
                            {/* Right Tabs */}
                            <div className="p-4 border-b border-black/10 flex gap-2">
                                <button onClick={()=> setRightTab('chat')}
                                    className={`px-4 py-2 rounded-full transition-colors ${
                                    rightTab === 'chat' ? 'bg-[#4A9B7F] text-white' : 'bg-gray-200 text-black
                                    hover:bg-gray-300'
                                    }`}
                                    >
                                    Chat
                                </button>
                                <button onClick={()=> setRightTab('destinations')}
                                    className={`px-4 py-2 rounded-full transition-colors ${
                                    rightTab === 'destinations' ? 'bg-[#4A9B7F] text-white' : 'bg-gray-200 text-black
                                    hover:bg-gray-300'
                                    }`}
                                    >
                                    Destinations
                                </button>
                                <button onClick={()=> setRightTab('summaries')}
                                    className={`px-4 py-2 rounded-full transition-colors ${
                                    rightTab === 'summaries' ? 'bg-[#4A9B7F] text-white' : 'bg-gray-200 text-black
                                    hover:bg-gray-300'
                                    }`}
                                    >
                                    Summaries
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div className="flex-1 overflow-hidden flex flex-col">
                                {/* Chat Tab */}
                                {rightTab === 'chat' && (
                                <>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                        {chatMessages.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.type==='user' ? 'justify-end'
                                            : 'justify-start' }`}>
                                            <div className={`max-w-[80%] rounded-2xl p-4 ${ msg.type==='user'
                                                ? 'bg-black text-white' : 'bg-gray-100 text-black' }`}>
                                                <p className="text-sm">{msg.message}</p>
                                            </div>
                                        </div>
                                        ))}
                                    </div>

                                    <div className="p-4 border-t border-black/10">
                                        <div className="flex gap-2">
                                            <input type="text" value={chatMessage} onChange={(e)=>
                                            setChatMessage(e.target.value)}
                                            placeholder="Where to?..."
                                            className="flex-1 px-4 py-2 bg-gray-100 rounded-full outline-none
                                            focus:ring-2 focus:ring-[#4A9B7F]"
                                            />
                                            <button
                                                className="p-2 bg-[#4A9B7F] text-white rounded-full hover:bg-[#3d8269] transition-colors">
                                                <Send className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </>
                                )}

                                {/* Destinations Tab */}
                                {rightTab === 'destinations' && (
                                <>
                                    <div className="p-4 border-b border-black/10 space-y-3">
                                        <div className="flex gap-2">
                                            <input type="text" value={searchQuery} onChange={(e)=>
                                            setSearchQuery(e.target.value)}
                                            placeholder="Search attractions, locations..."
                                            className="flex-1 px-4 py-2 bg-gray-100 rounded-full outline-none
                                            focus:ring-2 focus:ring-[#4A9B7F]"
                                            />
                                            <button
                                                className="px-4 py-2 bg-[#4A9B7F] text-white rounded-full hover:bg-[#3d8269] transition-colors flex items-center gap-2">
                                                <Sparkles className="w-4 h-4" />
                                                Optimize
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                        {destinations.map((dest) => (
                                        <div key={dest.id}
                                            className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-shadow">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-black mb-1">{dest.name}</h3>
                                                    <p className="text-xs text-black/60 flex items-center gap-1 mb-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {dest.location}
                                                    </p>
                                                    <span
                                                        className="inline-block px-2 py-0.5 bg-white rounded-full text-xs text-black/70">
                                                        {dest.type}
                                                    </span>
                                                </div>
                                                <button className={`px-3 py-1.5 rounded-full text-xs transition-colors
                                                    ${ dest.added ? 'bg-gray-300 text-black/60'
                                                    : 'bg-[#4A9B7F] text-white hover:bg-[#3d8269]' }`}>
                                                    {dest.added ? (
                                                    <Check className="w-4 h-4" />
                                                    ) : (
                                                    <ArrowRight className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        ))}
                                    </div>
                                </>
                                )}

                                {/* Summaries Tab */}
                                {rightTab === 'summaries' && (
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <h3 className="font-semibold text-black mb-3">Trip Details</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <Calendar className="w-5 h-5 text-black/60" />
                                                <div>
                                                    <p className="text-xs text-black/50">Dates</p>
                                                    <p className="text-sm font-medium">{tripInfo.dates}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Users className="w-5 h-5 text-black/60" />
                                                <div>
                                                    <p className="text-xs text-black/50">Travelers</p>
                                                    <p className="text-sm font-medium">{tripInfo.travelers} people</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <h3 className="font-semibold text-black mb-3">Trip Overview</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-sm text-black/60">Total Days</span>
                                                <span className="text-sm font-semibold">{tripInfo.days}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-black/60">Countries</span>
                                                <span className="text-sm font-semibold">3</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-black/60">Cities</span>
                                                <span className="text-sm font-semibold">6</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-black/60">Activities</span>
                                                <span className="text-sm font-semibold">35</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <h3 className="font-semibold text-black mb-3 flex items-center gap-2">
                                            <DollarSign className="w-5 h-5" />
                                            Cost Estimation
                                        </h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-sm text-black/60">Accommodation</span>
                                                <span className="text-sm font-semibold">$2,800</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-black/60">Transportation</span>
                                                <span className="text-sm font-semibold">$1,200</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-black/60">Activities</span>
                                                <span className="text-sm font-semibold">$2,500</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-black/60">Food & Dining</span>
                                                <span className="text-sm font-semibold">$2,000</span>
                                            </div>
                                            <div className="border-t border-black/10 mt-2 pt-2 flex justify-between">
                                                <span className="font-semibold text-black">Total Estimated</span>
                                                <span className="font-bold text-[#4A9B7F]">{tripInfo.budget}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-4 text-center text-xs text-black/60 border-t border-black/10">
                ©Odyssey. Made with ❤️ by Route6
            </footer>
        </div>
    </div>
    );
    }