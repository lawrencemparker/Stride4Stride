import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity, TextInput, Switch, Modal, KeyboardAvoidingView, Platform, Animated, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location'; 

// --- FIREBASE IMPORTS ---
import { auth, db } from './firebaseConfig'; 
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, orderBy, setDoc, doc, updateDoc, deleteDoc, arrayUnion, getDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

// --- SHARED COMPONENTS ---
const GlassCard = ({ children, style }) => (
  <View style={styles.cardWrapper}>
    <BlurView intensity={30} tint="dark" style={[styles.glass, style]}>
      {children}
    </BlurView>
  </View>
);

const Toast = ({ message, visible, onHide }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true })
      ]).start(() => onHide());
    }
  }, [visible]);
  if (!visible) return null;
  return (
    <Animated.View style={[styles.toastContainer, { opacity }]}>
      <BlurView intensity={90} tint="dark" style={styles.toastGlass}>
        <Text style={styles.toastText}>✓ {message}</Text>
      </BlurView>
    </Animated.View>
  );
};

// --- AUTH SCREENS ---

const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#000000', '#1e3a8a']} style={styles.background} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', padding: 30 }}>
        <View style={{ marginBottom: 50 }}>
          <Text style={[styles.greeting, { textAlign: 'center', fontSize: 42, letterSpacing: 1 }]}>STRIDE 4 STRIDE</Text>
          <Text style={[styles.subGreeting, { textAlign: 'center', marginTop: 10 }]}>Welcome Back. Stay locked in.</Text>
        </View>
        <GlassCard>
          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <TextInput style={styles.input} placeholder="runner@email.com" placeholderTextColor="#555" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TouchableOpacity style={{ marginTop: 25, alignSelf: 'center', padding: 10 }} onPress={() => onLogin(email, "runner123")}>
            <Text style={{ color: '#22c55e', fontSize: 24, fontWeight: 'bold' }}>Log In</Text>
          </TouchableOpacity>
        </GlassCard>
      </KeyboardAvoidingView>
    </View>
  );
};

const OnboardingFlow = ({ onRegister }) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const nextStep = () => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -width, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 0, useNativeDriver: true })
    ]).start(() => setStep(step + 1));
  };

  const handleFinish = () => {
    if (!name || !email || !phone) { setError("Please fill out all fields."); return; }
    onRegister(email, "runner123", name, phone);
  };

  const steps = [
    { title: "Run Smarter.", subtitle: "Track your miles, manage your gear, and visualize your progress like a pro.", icon: "🏃‍♂️" },
    { title: "Stride 4 Stride.", subtitle: "Unlock Premium to create clubs, host leaderboards, and keep up with the competition.", icon: "🏆" }
  ];

  if (step < 2) {
    return (
      <Animated.View style={[styles.onboardingContainer, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
        <LinearGradient colors={['#991b1b', '#000000']} style={styles.background} />
        <SafeAreaView style={styles.onboardingContent}>
          <TouchableOpacity style={styles.skipBtn} onPress={() => setStep(2)}><Text style={styles.skipText}>Skip</Text></TouchableOpacity>
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <Text style={{fontSize: 80, marginBottom: 20}}>{steps[step].icon}</Text>
            <Text style={styles.onboardingTitle}>{steps[step].title}</Text>
            <Text style={styles.onboardingSub}>{steps[step].subtitle}</Text>
          </View>
          <View style={styles.indicatorRow}>{[0,1,2].map(i => <View key={i} style={[styles.dot, step === i && styles.activeDot]} />)}</View>
          <TouchableOpacity style={styles.onboardingBtn} onPress={nextStep}><Text style={styles.buttonText}>Next</Text></TouchableOpacity>
        </SafeAreaView>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={styles.onboardingContainer}>
      <LinearGradient colors={['#000000', '#1e3a8a']} style={styles.background} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.onboardingScrollContent} keyboardShouldPersistTaps="handled">
          <View style={{marginTop: 60}}>
            <Text style={[styles.greeting, {textAlign: 'center'}]}>Who are you?</Text>
            <Text style={[styles.subGreeting, {textAlign: 'center'}]}>Create your runner profile.</Text>
          </View>
          <GlassCard style={{marginTop: 30}}>
            <Text style={styles.label}>FULL NAME</Text>
            <TextInput style={styles.input} placeholder="John Doe" placeholderTextColor="#555" value={name} onChangeText={setName} />
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <TextInput style={styles.input} placeholder="runner@email.com" placeholderTextColor="#555" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <Text style={styles.label}>PHONE NUMBER</Text>
            <TextInput style={styles.input} placeholder="(555) 123-4567" placeholderTextColor="#555" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </GlassCard>
          <TouchableOpacity style={styles.onboardingBtn} onPress={handleFinish}>
            <Text style={styles.buttonText}>Enter Dashboard</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
};

// --- APP FEATURES ---

const ProfileScreen = ({ setCurrentScreen, userProfile, onUpdateUser, onCancelSubscription }) => {
  const [fullName, setFullName] = useState(userProfile.fullName || '');
  const [email, setEmail] = useState(userProfile.email || '');
  const [phone, setPhone] = useState(userProfile.phone || '');
  
  const [shareConsent, setShareConsent] = useState(() => {
    const val = userProfile.shareConsent;
    return val === true || val === 'true' || val === undefined;
  });

  const handleCancelClick = () => {
      Alert.alert(
          "Cancel Subscription?",
          "You will lose the ability to create new clubs. Your existing clubs will remain.",
          [
              { text: "Keep It", style: "cancel" },
              { text: "Confirm Cancel", style: "destructive", onPress: onCancelSubscription }
          ]
      );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity onPress={() => setCurrentScreen('Home')} style={styles.backBtn}><Text style={styles.backBtnText}>← Back to Dashboard</Text></TouchableOpacity>
        <Text style={styles.greeting}>My Profile</Text>
        <GlassCard style={{marginTop: 25}}>
          <Text style={styles.label}>FULL NAME</Text><TextInput style={styles.input} value={fullName} onChangeText={setFullName} />
          <Text style={styles.label}>EMAIL ADDRESS</Text><TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Text style={styles.label}>PHONE NUMBER</Text><TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <View style={styles.privacyRow}>
            <View style={{flex: 1, paddingRight: 10}}><Text style={styles.valueTitle}>Club Visibility</Text><Text style={styles.valueDesc}>Allow clubs to view my contact info.</Text></View>
            <Switch 
                trackColor={{ false: "#767577", true: "#22c55e" }} 
                thumbColor={"#f4f3f4"} 
                onValueChange={(val) => setShareConsent(val)} 
                value={shareConsent} 
            />
          </View>
          <TouchableOpacity style={[styles.mainActionButton, {marginTop: 30, width: '100%', backgroundColor: '#22c55e'}]} onPress={() => onUpdateUser({ fullName, email, phone, shareConsent })}><Text style={styles.buttonText}>Save Changes</Text></TouchableOpacity>
        </GlassCard>

        {/* NEW: SUBSCRIPTION MANAGEMENT */}
        {userProfile.isFounder && (
            <GlassCard style={{marginTop: 20, borderColor: 'rgba(239, 68, 68, 0.5)'}}>
                <Text style={{color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 5}}>Founder Subscription</Text>
                <Text style={styles.valueDesc}>You currently have access to create and manage clubs.</Text>
                <TouchableOpacity 
                    style={{marginTop: 15, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#ef4444', alignItems: 'center'}}
                    onPress={handleCancelClick}
                >
                    <Text style={{color: '#ef4444', fontWeight: 'bold'}}>Cancel Subscription</Text>
                </TouchableOpacity>
            </GlassCard>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const LogPage = ({ setCurrentScreen, shoes, onSaveRun, setToastMessage, setShowToast }) => {
  const [selectedClub, setSelectedClub] = useState('None');
  const [selectedShoe, setSelectedShoe] = useState(null);
  const [distance, setDistance] = useState('');
  const [showClubPicker, setShowClubPicker] = useState(false);
  const [showShoePicker, setShowShoePicker] = useState(false);
  
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState('Jan 27, 2026');
  const [viewDate, setViewDate] = useState(new Date()); 
  
  const testClubs = ['None', 'Pembroke Pines Striders', 'South Florida Run Club', 'Brickell Track Club'];
  const activeShoes = shoes.filter(s => !s.retired);
  
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfWeek = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay(); 

  const handleMonthChange = (increment) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setViewDate(newDate);
  };

  const daysInCurrentMonth = getDaysInMonth(viewDate);
  const paddingDays = getFirstDayOfWeek(viewDate);
  const calendarGrid = [...Array(paddingDays).fill(null), ...Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1)];

  const isSelectedDay = (day) => {
      if (!day) return false;
      const targetStr = `${months[viewDate.getMonth()].substring(0, 3)} ${day}, ${viewDate.getFullYear()}`;
      return selectedDate === targetStr;
  };

  const handleSave = () => { 
    if (distance) { 
      onSaveRun({ 
        date: selectedDate, 
        distance: parseFloat(distance), 
        shoe: selectedShoe ? selectedShoe.name : 'No Shoe Selected', 
        shoeId: selectedShoe ? selectedShoe.id : null, 
        club: selectedClub !== 'None' ? selectedClub : null 
      }); 
      
      if(setToastMessage && setShowToast) {
          setToastMessage("Your run has been saved. Great job out there!");
          setShowToast(true);
      }
      setCurrentScreen('History'); 
    } else {
        Alert.alert("Missing Info", "Please enter the distance for your run.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <TouchableOpacity onPress={() => setCurrentScreen('Home')} style={styles.backBtn}><Text style={styles.backBtnText}>← Back to Dashboard</Text></TouchableOpacity>
      <Text style={styles.greeting}>Log Run</Text>
      
      <GlassCard style={{marginTop: 25}}>
        <Text style={styles.label}>DISTANCE (MILES) *</Text>
        <TextInput style={styles.input} placeholder="0.00" placeholderTextColor="#555" keyboardType="numeric" value={distance} onChangeText={setDistance} />
        
        <Text style={styles.label}>RUN DATE *</Text>
        <TouchableOpacity 
            style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} 
            onPress={() => setShowCalendar(true)}
        >
            <Text style={{ color: 'white', fontWeight: '600' }}>{selectedDate}</Text>
            <Text style={{ fontSize: 16 }}>📅</Text>
        </TouchableOpacity>
        
        <Text style={styles.label}>RUNNING SHOES (OPTIONAL)</Text>
        <TouchableOpacity 
            style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} 
            onPress={() => setShowShoePicker(true)}
        >
            <Text style={{ color: 'white', fontWeight: '600' }}>{selectedShoe ? selectedShoe.name : 'Select Shoes'}</Text>
            <Text style={{ fontSize: 16 }}>👟</Text>
        </TouchableOpacity>
        
        <Text style={styles.label}>RUNNING CLUB (OPTIONAL)</Text>
        <TouchableOpacity 
            style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} 
            onPress={() => setShowClubPicker(true)}
        >
            <Text style={{ color: 'white', fontWeight: '600' }}>{selectedClub}</Text>
            <Text style={{ fontSize: 16 }}>▼</Text>
        </TouchableOpacity>
        
        <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.secondaryActionButton} onPress={() => setCurrentScreen('Home')}>
                <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mainActionButton} onPress={handleSave}>
                <Text style={styles.buttonText}>Save Run</Text>
            </TouchableOpacity>
        </View>
      </GlassCard>

      {/* CALENDAR MODAL */}
      <Modal transparent visible={showCalendar} animationType="fade">
        <View style={styles.modalOverlay}>
            <BlurView intensity={95} tint="dark" style={styles.modalContent}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25}}>
                    <View style={{flexDirection:'row', alignItems:'center'}}>
                            <Text style={{color: 'white', fontSize: 18, fontWeight: '700', marginRight: 5}}>{months[viewDate.getMonth()]} {viewDate.getFullYear()}</Text>
                    </View>
                    <View style={{flexDirection: 'row', gap: 20}}>
                        <TouchableOpacity onPress={() => handleMonthChange(-1)}><Text style={{color: '#3b82f6', fontSize: 24, fontWeight: 'bold'}}>{'<'}</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => handleMonthChange(1)}><Text style={{color: '#3b82f6', fontSize: 24, fontWeight: 'bold'}}>{'>'}</Text></TouchableOpacity>
                    </View>
                </View>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15}}>{weekDays.map((d, i) => <Text key={i} style={{width: '14%', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight:'700'}}>{d}</Text>)}</View>
                <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
                    {calendarGrid.map((day, index) => {
                        const active = isSelectedDay(day);
                        return (
                            <View key={index} style={{width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 5}}>
                                {day ? (
                                    <TouchableOpacity 
                                        onPress={() => { 
                                            const shortMonth = months[viewDate.getMonth()].substring(0, 3);
                                            setSelectedDate(`${shortMonth} ${day}, ${viewDate.getFullYear()}`); 
                                            setShowCalendar(false); 
                                        }}
                                        style={{width: 38, height: 38, borderRadius: 19, backgroundColor: active ? '#3b82f6' : 'transparent', alignItems: 'center', justifyContent: 'center'}}
                                    >
                                        <Text style={{color: active ? 'white' : 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: active ? 'bold' : '400'}}>{day}</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        );
                    })}
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setShowCalendar(false)}><Text style={styles.buttonText}>Cancel</Text></TouchableOpacity>
            </BlurView>
        </View>
      </Modal>
      
      {/* CLUB PICKER */}
      <Modal transparent visible={showClubPicker} animationType="slide">
        <View style={styles.bottomSheetOverlay}>
            <BlurView intensity={95} tint="dark" style={styles.bottomSheetContent}>
                <Text style={styles.modalTitle}>Select Your Club</Text>
                <ScrollView contentContainerStyle={{flexGrow: 0}}>
                    {testClubs.map(club => (
                        <TouchableOpacity key={club} style={[styles.clubItem, selectedClub === club && styles.clubItemSelected]} onPress={() => { setSelectedClub(club); setShowClubPicker(false); }}>
                            <Text style={styles.clubItemText}>{club}</Text>
                            {selectedClub === club && <Text style={styles.checkMark}>✓</Text>}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                <TouchableOpacity style={[styles.cancelButton, {marginTop: 10}]} onPress={() => setShowClubPicker(false)}>
                    <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
            </BlurView>
        </View>
      </Modal>
      
      {/* SHOE PICKER (FIXED) */}
      <Modal transparent visible={showShoePicker} animationType="slide">
        <View style={styles.bottomSheetOverlay}>
            <BlurView intensity={95} tint="dark" style={styles.bottomSheetContent}>
                <Text style={styles.modalTitle}>Select Shoes</Text>
                <ScrollView contentContainerStyle={{flexGrow: 0}}>
                    {/* ALWAYS SHOW NONE OPTION */}
                    <TouchableOpacity style={[styles.clubItem, selectedShoe === null && styles.clubItemSelected]} onPress={() => { setSelectedShoe(null); setShowShoePicker(false); }}>
                        <Text style={styles.clubItemText}>None (Run Barefoot/Other)</Text>
                        {selectedShoe === null && <Text style={styles.checkMark}>✓</Text>}
                    </TouchableOpacity>

                    {activeShoes.map(shoe => (
                        <TouchableOpacity key={shoe.id} style={[styles.clubItem, selectedShoe?.id === shoe.id && styles.clubItemSelected]} onPress={() => { setSelectedShoe(shoe); setShowShoePicker(false); }}>
                            <Text style={styles.clubItemText}>{shoe.name}</Text>
                            {selectedShoe?.id === shoe.id && <Text style={styles.checkMark}>✓</Text>}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                <TouchableOpacity style={[styles.cancelButton, {marginTop: 10}]} onPress={() => setShowShoePicker(false)}>
                    <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
            </BlurView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const HistoryScreen = ({ setCurrentScreen, runs, shoes, onDeleteRun, onUpdateRun }) => {
  const [filter, setFilter] = useState('All Time');
  const [selectedRun, setSelectedRun] = useState(null);
  const [modalView, setModalView] = useState('form'); 
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDistance, setEditDistance] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editShoe, setEditShoe] = useState(null);
  const [editClub, setEditClub] = useState('None');
  const [viewDate, setViewDate] = useState(new Date()); 

  const filters = ['All Time', 'Jan \'26', 'Dec \'25', 'Nov \'25'];
  const testClubs = ['None', 'Pembroke Pines Striders', 'South Florida Run Club', 'Brickell Track Club'];
  const activeShoes = shoes ? shoes.filter(s => !s.retired) : [];
  
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const filteredRuns = runs.filter(run => {
    if (filter === 'All Time') return true;
    const parts = filter.split(" '"); 
    if (parts.length < 2) return true;
    const filterMonth = parts[0]; 
    const filterYear = "20" + parts[1];
    return run.date.includes(filterMonth) && run.date.includes(filterYear);
  });

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfWeek = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay(); 

  const handleMonthChange = (increment) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setViewDate(newDate);
  };

  const daysInCurrentMonth = getDaysInMonth(viewDate);
  const paddingDays = getFirstDayOfWeek(viewDate);
  const calendarGrid = [...Array(paddingDays).fill(null), ...Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1)];

  const handleEditClick = (run) => { 
    setSelectedRun(run); 
    setEditDistance(String(run.distance));
    setEditDate(run.date);
    if (run.shoeId) {
        const found = activeShoes.find(s => s.id === run.shoeId);
        setEditShoe(found || { name: run.shoe, id: run.shoeId });
    } else {
        setEditShoe(null); 
    }
    setEditClub(run.club || 'None');
    try {
        const parsedDate = new Date(run.date);
        if (!isNaN(parsedDate)) setViewDate(parsedDate);
        else setViewDate(new Date());
    } catch (e) { setViewDate(new Date()); }
    setModalView('form');
    setShowEditModal(true); 
  };

  const saveEdit = () => { 
    if (onUpdateRun && selectedRun) {
        onUpdateRun({ 
            ...selectedRun, 
            distance: parseFloat(editDistance),
            date: editDate,
            shoe: editShoe ? editShoe.name : 'No Shoe', 
            shoeId: editShoe ? editShoe.id : null,
            club: editClub
        }); 
        setShowEditModal(false);
    }
  };

  const confirmDelete = () => {
    if (onDeleteRun && selectedRun) {
        onDeleteRun(selectedRun.id); 
        setShowEditModal(false);
    }
  };
  
  const isSelectedDay = (day) => {
      if (!day) return false;
      const targetStr = `${months[viewDate.getMonth()].substring(0, 3)} ${day}, ${viewDate.getFullYear()}`;
      return editDate === targetStr;
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <TouchableOpacity onPress={() => setCurrentScreen('Home')} style={styles.backBtn}><Text style={styles.backBtnText}>← Back to Dashboard</Text></TouchableOpacity>
      <Text style={styles.greeting}>History</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20, marginTop: 10}}>
        {filters.map(f => (<TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.filterPill, filter === f && styles.filterPillActive]}><Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text></TouchableOpacity>))}
      </ScrollView>
      
      {filteredRuns.length === 0 ? (
          <View style={{marginTop: 50, alignItems: 'center'}}>
            <Text style={{color: 'rgba(255,255,255,0.4)', textAlign:'center', fontSize: 16}}>No runs found for {filter}.</Text>
          </View>
      ) : (
          filteredRuns.map((run, i) => (
            <TouchableOpacity key={run.id || i} onPress={() => handleEditClick(run)}>
                <GlassCard style={{padding: 18, marginBottom: 10}}>
                    <View style={styles.row}>
                        <View>
                            <Text style={styles.valueTitle}>{run.date}</Text>
                            <Text style={styles.valueDesc}>{run.shoe}</Text>
                        </View>
                        <Text style={{fontSize: 24, fontWeight: '900', color: 'white'}}>{run.distance} <Text style={{fontSize:14, fontWeight:'400'}}>mi</Text></Text>
                    </View>
                </GlassCard>
            </TouchableOpacity>
        ))
      )}
      
      <Modal transparent visible={showEditModal} animationType="fade">
        <View style={styles.modalOverlay}>
            <BlurView intensity={100} tint="dark" style={[styles.confirmModal, {maxHeight: '85%'}]}>
                
                {modalView === 'form' && (
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.modalTitle}>Edit Run</Text>
                        
                        <Text style={styles.label}>DISTANCE (MILES)</Text>
                        <TextInput style={styles.input} value={editDistance} onChangeText={setEditDistance} keyboardType="numeric" />
                        
                        <Text style={styles.label}>RUN DATE</Text>
                        <TouchableOpacity style={styles.input} onPress={() => setModalView('calendar')}>
                            <Text style={{ color: 'white', fontWeight: '600' }}>{editDate}</Text>
                            <Text style={styles.dropdownArrow}>📅</Text>
                        </TouchableOpacity>

                        <Text style={styles.label}>RUNNING SHOES (OPTIONAL)</Text>
                        <TouchableOpacity style={styles.input} onPress={() => setModalView('shoes')}>
                            <Text style={{ color: 'white', fontWeight: '600' }}>{editShoe ? editShoe.name : 'Select Shoes'}</Text>
                            <Text style={styles.dropdownArrow}>👟</Text>
                        </TouchableOpacity>

                        <Text style={styles.label}>RUNNING CLUB (OPTIONAL)</Text>
                        <TouchableOpacity style={styles.input} onPress={() => setModalView('clubs')}>
                            <Text style={{ color: 'white', fontWeight: '600' }}>{editClub}</Text>
                            <Text style={styles.dropdownArrow}>▼</Text>
                        </TouchableOpacity>

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity style={styles.secondaryActionButton} onPress={() => setModalView('delete')}>
                                <Text style={[styles.buttonText, {color: '#ef4444'}]}>Delete</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.mainActionButton} onPress={saveEdit}>
                                <Text style={styles.buttonText}>Save Changes</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <TouchableOpacity style={{marginTop: 20, alignSelf:'center'}} onPress={() => setShowEditModal(false)}>
                            <Text style={{color: 'rgba(255,255,255,0.5)'}}>Cancel</Text>
                        </TouchableOpacity>
                    </ScrollView>
                )}

                {modalView === 'calendar' && (
                    <View>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25}}>
                            <View style={{flexDirection:'row', alignItems:'center'}}>
                                 <Text style={{color: 'white', fontSize: 18, fontWeight: '700', marginRight: 5}}>{months[viewDate.getMonth()]} {viewDate.getFullYear()}</Text>
                                 <Text style={{color: '#3b82f6', fontSize: 18, fontWeight:'bold'}}>{'>'}</Text>
                            </View>
                            <View style={{flexDirection: 'row', gap: 20}}>
                                <TouchableOpacity onPress={() => handleMonthChange(-1)}><Text style={{color: '#3b82f6', fontSize: 24, fontWeight: 'bold'}}>{'<'}</Text></TouchableOpacity>
                                <TouchableOpacity onPress={() => handleMonthChange(1)}><Text style={{color: '#3b82f6', fontSize: 24, fontWeight: 'bold'}}>{'>'}</Text></TouchableOpacity>
                            </View>
                        </View>

                        <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15}}>
                            {weekDays.map((d, i) => (
                                <Text key={i} style={{width: '14%', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight:'700'}}>{d}</Text>
                            ))}
                        </View>

                        <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
                            {calendarGrid.map((day, index) => {
                                const active = isSelectedDay(day);
                                return (
                                    <View key={index} style={{width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 5}}>
                                        {day ? (
                                            <TouchableOpacity 
                                                onPress={() => { 
                                                    const shortMonth = months[viewDate.getMonth()].substring(0, 3);
                                                    setEditDate(`${shortMonth} ${day}, ${viewDate.getFullYear()}`); 
                                                    setModalView('form'); 
                                                }}
                                                style={{width: 38, height: 38, borderRadius: 19, backgroundColor: active ? '#3b82f6' : 'transparent', alignItems: 'center', justifyContent: 'center'}}
                                            >
                                                <Text style={{color: active ? 'white' : 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: active ? 'bold' : '400'}}>{day}</Text>
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>
                                );
                            })}
                        </View>
                        <TouchableOpacity style={[styles.cancelButton, {marginTop: 20, width: '100%', backgroundColor: 'rgba(255,255,255,0.1)'}]} onPress={() => setModalView('form')}><Text style={styles.buttonText}>Cancel</Text></TouchableOpacity>
                    </View>
                )}

                {modalView === 'shoes' && (
                    <View style={{height: '100%'}}>
                        <Text style={styles.modalTitle}>Select Shoes</Text>
                        <ScrollView contentContainerStyle={{flexGrow: 1}}>
                            <TouchableOpacity style={[styles.clubItem, editShoe === null && styles.clubItemSelected]} onPress={() => { setEditShoe(null); setModalView('form'); }}>
                                <Text style={styles.clubItemText}>None (Optional)</Text>
                                {editShoe === null && <Text style={styles.checkMark}>✓</Text>}
                            </TouchableOpacity>
                            {activeShoes.map(shoe => (
                                <TouchableOpacity key={shoe.id} style={[styles.clubItem, editShoe?.id === shoe.id && styles.clubItemSelected]} onPress={() => { setEditShoe(shoe); setModalView('form'); }}>
                                    <Text style={styles.clubItemText}>{shoe.name}</Text>
                                    {editShoe?.id === shoe.id && <Text style={styles.checkMark}>✓</Text>}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={[styles.cancelButton, {marginTop: 10, width: '100%', backgroundColor: 'rgba(255,255,255,0.1)'}]} onPress={() => setModalView('form')}>
                            <Text style={styles.buttonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {modalView === 'clubs' && (
                    <View style={{height: '100%'}}>
                        <Text style={styles.modalTitle}>Select Club</Text>
                        <ScrollView contentContainerStyle={{flexGrow: 1}}>
                            {testClubs.map(club => (
                                <TouchableOpacity key={club} style={[styles.clubItem, editClub === club && styles.clubItemSelected]} onPress={() => { setEditClub(club); setModalView('form'); }}>
                                    <Text style={styles.clubItemText}>{club}</Text>
                                    {editClub === club && <Text style={styles.checkMark}>✓</Text>}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={[styles.cancelButton, {marginTop: 10, width: '100%', backgroundColor: 'rgba(255,255,255,0.1)'}]} onPress={() => setModalView('form')}>
                            <Text style={styles.buttonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {modalView === 'delete' && (
                    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 20 }}>
                        <Text style={{fontSize: 22, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 15}}>
                            Are you sure?
                        </Text>
                        <Text style={{color: 'rgba(255,255,255,0.8)', fontSize: 15, textAlign: 'center', marginBottom: 30, lineHeight: 22, paddingHorizontal: 10}}>
                            Removing this run will permanently delete it from your history. This may affect your total mileage and club stats. Do you want to proceed?
                        </Text>
                        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', width: '110%', marginHorizontal: -20 }}>
                            <TouchableOpacity 
                                style={{ flex: 1, paddingVertical: 18, alignItems: 'center', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.15)' }} 
                                onPress={() => setModalView('form')}
                            >
                                <Text style={{ color: '#3b82f6', fontSize: 17, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={{ flex: 1, paddingVertical: 18, alignItems: 'center' }} 
                                onPress={confirmDelete}
                            >
                                <Text style={{ color: '#ef4444', fontSize: 17, fontWeight: '600' }}>Remove</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

            </BlurView>
        </View>
      </Modal>
    </ScrollView>
  );
};


const ManageShoesScreen = ({ setCurrentScreen, shoes, onUpdateShoeName, onDeleteShoe, onAddShoe }) => {
  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedShoe, setSelectedShoe] = useState(null);
  const [newName, setNewName] = useState('');
  const [modalView, setModalView] = useState('edit');

  // Add State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');

  const handleEditClick = (shoe) => {
    setSelectedShoe(shoe);
    setNewName(shoe.name);
    setModalView('edit'); 
    setShowEditModal(true);
  };

  const saveShoeName = () => {
    if (selectedShoe && newName) {
      onUpdateShoeName(selectedShoe.id, newName);
      setShowEditModal(false);
    }
  };

  const confirmDelete = () => {
    if (selectedShoe && onDeleteShoe) {
        onDeleteShoe(selectedShoe.id);
        setShowEditModal(false);
    }
  };

  const saveNewShoe = () => {
      if (addName.trim()) {
          onAddShoe(addName);
          setAddName(''); // Reset
          setShowAddModal(false);
      }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <TouchableOpacity onPress={() => setCurrentScreen('Home')} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← Back to Dashboard</Text>
      </TouchableOpacity>
      
      {/* HEADER WITH ADD BUTTON */}
      <View style={styles.row}>
        <View>
            <Text style={styles.greeting}>Gear Tracker</Text>
            <Text style={styles.subGreeting}>Manage your rotation.</Text>
        </View>
        <TouchableOpacity style={styles.addCircleBtn} onPress={() => setShowAddModal(true)}>
            <Text style={styles.buttonText}>+</Text>
        </TouchableOpacity>
      </View>

      {shoes.map(shoe => (
        <GlassCard key={shoe.id} style={{ marginTop: 20 }}>
          <View style={styles.row}>
            <Text style={styles.shoeName}>{shoe.name}</Text>
            <TouchableOpacity onPress={() => handleEditClick(shoe)}>
              <Text style={{ fontSize: 20 }}>✏️</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.progressBarBase}>
            <View 
                style={[
                    styles.progressBarFill, 
                    { 
                        width: `${Math.min(((shoe.miles || 0)/shoe.limit)*100, 100)}%`, 
                        backgroundColor: (shoe.miles/shoe.limit) > 0.9 ? '#ef4444' : '#3b82f6' 
                    }
                ]} 
            />
          </View>
          <View style={[styles.row, {marginTop: 10}]}>
            <Text style={styles.valueDesc}>Mileage</Text>
            <Text style={[styles.shoeMiles, {marginTop:0}]}>
                {(shoe.miles || 0).toFixed(1)} / {shoe.limit} mi
            </Text>
          </View>
        </GlassCard>
      ))}

      {/* --- ADD SHOE MODAL (New) --- */}
      <Modal transparent visible={showAddModal} animationType="fade">
        <View style={styles.modalOverlay}>
            <BlurView intensity={100} tint="dark" style={styles.confirmModal}>
                <Text style={styles.modalTitle}>Add New Shoe</Text>
                
                <Text style={styles.label}>SHOE NAME</Text>
                <TextInput 
                    style={[styles.input, {color: '#FFFFFF', fontWeight: '600', fontSize: 16}]} 
                    value={addName} 
                    onChangeText={setAddName}
                    placeholder="e.g. Nike Pegasus 40"
                    placeholderTextColor="#999999" 
                />
                
                <TouchableOpacity 
                    style={{
                        marginTop: 20, 
                        backgroundColor: '#22c55e', 
                        paddingVertical: 16, 
                        borderRadius: 16, 
                        alignItems: 'center',
                        justifyContent: 'center'
                    }} 
                    onPress={saveNewShoe}
                >
                    <Text style={{color: '#FFFFFF', fontWeight: 'bold', fontSize: 16, zIndex: 10}}>
                        Add Shoe
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={{marginTop: 20, alignSelf:'center'}} onPress={() => setShowAddModal(false)}>
                    <Text style={{color: 'rgba(255,255,255,0.5)', fontWeight: '600'}}>Cancel</Text>
                </TouchableOpacity>
            </BlurView>
        </View>
      </Modal>

      {/* --- EDIT/DELETE SHOE MODAL (Existing) --- */}
      <Modal transparent visible={showEditModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView intensity={100} tint="dark" style={styles.confirmModal}>
            
            {/* VIEW 1: RENAME FORM */}
            {modalView === 'edit' && (
                <>
                    <Text style={styles.modalTitle}>Edit Shoe</Text>
                    
                    <Text style={styles.label}>SHOE NAME</Text>
                    <TextInput 
                        style={[styles.input, {color: '#FFFFFF', fontWeight: '600', fontSize: 16}]} 
                        value={newName} 
                        onChangeText={setNewName}
                        placeholder="Enter shoe name"
                        placeholderTextColor="#999999" 
                    />
                    
                    {/* Green Save Button */}
                    <TouchableOpacity 
                        style={{
                            marginTop: 20, 
                            backgroundColor: '#22c55e', 
                            paddingVertical: 16, 
                            borderRadius: 16, 
                            alignItems: 'center',
                            justifyContent: 'center'
                        }} 
                        onPress={saveShoeName}
                    >
                        <Text style={{color: '#FFFFFF', fontWeight: 'bold', fontSize: 16, zIndex: 10}}>
                            Save Name
                        </Text>
                    </TouchableOpacity>

                    {/* Red Delete Button */}
                    <TouchableOpacity 
                        style={{
                            marginTop: 12, 
                            backgroundColor: '#ef4444', 
                            paddingVertical: 16, 
                            borderRadius: 16, 
                            alignItems: 'center',
                            justifyContent: 'center'
                        }} 
                        onPress={() => setModalView('delete')}
                    >
                        <Text style={{color: '#FFFFFF', fontWeight: 'bold', fontSize: 16, zIndex: 10}}>
                            Delete Shoe
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={{marginTop: 20, alignSelf:'center'}} onPress={() => setShowEditModal(false)}>
                        <Text style={{color: 'rgba(255,255,255,0.5)', fontWeight: '600'}}>Cancel</Text>
                    </TouchableOpacity>
                </>
            )}

            {/* VIEW 2: DELETE CONFIRMATION */}
            {modalView === 'delete' && (
                <View style={{alignItems: 'center'}}>
                    <Text style={{fontSize: 22, fontWeight: 'bold', color: 'white', marginBottom: 15, textAlign: 'center'}}>
                        Delete Shoe?
                    </Text>
                    <Text style={{color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 25, paddingHorizontal: 10, lineHeight: 22, fontSize: 15}}>
                        Are you sure? This will remove the shoe from your list, but runs logged with it will remain.
                    </Text>

                    {/* Split Buttons */}
                    <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                        <TouchableOpacity 
                            style={{
                                flex: 1, 
                                backgroundColor: 'rgba(255,255,255,0.1)', 
                                paddingVertical: 16, 
                                borderRadius: 16, 
                                alignItems: 'center',
                                justifyContent: 'center'
                            }} 
                            onPress={() => setModalView('edit')}
                        >
                            <Text style={{color: '#FFFFFF', fontWeight: 'bold', fontSize: 16}}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={{
                                flex: 1, 
                                backgroundColor: '#ef4444', 
                                paddingVertical: 16, 
                                borderRadius: 16, 
                                alignItems: 'center',
                                justifyContent: 'center'
                            }} 
                            onPress={confirmDelete}
                        >
                            <Text style={{color: '#FFFFFF', fontWeight: 'bold', fontSize: 16}}>Confirm</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

          </BlurView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const ClubsScreen = ({ setCurrentScreen, clubs, onSelectClub, userProfile, onUnlockFounder }) => {
  // LOGIC FIX: Check the database profile, not local state
  const isFounder = userProfile?.isFounder === true; 
  // We also show the list if they are already a member of a club (even if not a founder)
  const hasClubs = clubs.length > 0; 

  // If NOT a founder AND hasn't joined any clubs, show the Sales Page
  if (!isFounder && !hasClubs) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity onPress={() => setCurrentScreen('Home')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back to Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.greeting}>Lead the Pack</Text>
        <Text style={styles.subGreeting}>Don't just join a club. Build one.</Text>
        
        <GlassCard style={{marginTop: 25}}>
          <View style={styles.premiumBadge}><Text style={styles.premiumBadgeText}>ORGANIZER ACCESS</Text></View>
          <Text style={styles.modalTitle}>Become a Founder</Text>
          
          <View style={styles.valueRow}><Text style={styles.valueIcon}>🏗️</Text><View style={{flex: 1}}><Text style={styles.valueTitle}>Create & Customize</Text><Text style={styles.valueDesc}>Build your own official club, set the rules, and define your team's culture.</Text></View></View>
          <View style={styles.valueRow}><Text style={styles.valueIcon}>📣</Text><View style={{flex: 1}}><Text style={styles.valueTitle}>Post Announcements</Text><Text style={styles.valueDesc}>Control the narrative. Post group run alerts and club news directly to your members.</Text></View></View>
          <View style={styles.valueRow}><Text style={styles.valueIcon}>✉️</Text><View style={{flex: 1}}><Text style={styles.valueTitle}>Invite & Manage</Text><Text style={styles.valueDesc}>Grow your tribe. Send invites to local runners and manage your member roster.</Text></View></View>
          
          <View style={styles.pricingContainer}>
            <Text style={styles.priceText}>$9.99<Text style={styles.monthText}>/mo</Text></Text>
            <TouchableOpacity style={styles.mainActionButton} onPress={onUnlockFounder}>
                <Text style={styles.buttonText}>Unlock Club Creator</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </ScrollView>
    );
  }

  // If Founder OR has clubs, show the list
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <TouchableOpacity onPress={() => setCurrentScreen('Home')} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← Back to Dashboard</Text>
      </TouchableOpacity>
      
      <View style={styles.row}>
        <Text style={styles.greeting}>My Clubs</Text>
        {/* Only show Create button if they are a Founder */}
        {isFounder && (
            <TouchableOpacity style={styles.addCircleBtn} onPress={() => setCurrentScreen('CreateClub')}>
                <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
        )}
      </View>
      
      {clubs.map((c) => (
        <TouchableOpacity key={c.id} onPress={() => onSelectClub(c)}>
            <GlassCard style={{marginTop: 10}}>
                <View style={styles.row}>
                    <View>
                        <Text style={styles.valueTitle}>{c.name}</Text>
                        <Text style={styles.valueDesc}>{c.members.length} members</Text>
                    </View>
                    <Text style={styles.manageLink}>View Console →</Text>
                </View>
            </GlassCard>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};
const CreateClubScreen = ({ setCurrentScreen, onLaunch }) => {
  const [clubName, setClubName] = useState('');
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity onPress={() => setCurrentScreen('Clubs')} style={styles.backBtn}><Text style={styles.backBtnText}>← Back to Hub</Text></TouchableOpacity>
        <Text style={styles.greeting}>Start Your Club</Text>
        <GlassCard style={{marginTop: 25}}>
          <Text style={styles.label}>CLUB NAME</Text><TextInput style={styles.input} placeholder="e.g. Pines Elite Runners" placeholderTextColor="#555" value={clubName} onChangeText={setClubName} />
          <TouchableOpacity style={[styles.mainActionButton, {marginTop: 30, width: '100%'}]} onPress={() => onLaunch(clubName)}><Text style={styles.buttonText}>Launch Club</Text></TouchableOpacity>
        </GlassCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const JoinClubScreen = ({ setCurrentScreen, onJoin }) => {
  const [code, setCode] = useState('');
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity onPress={() => setCurrentScreen('Home')} style={styles.backBtn}><Text style={styles.backBtnText}>← Back to Dashboard</Text></TouchableOpacity>
        <Text style={styles.greeting}>Join a Club</Text>
        <GlassCard style={{marginTop: 25}}>
          <Text style={styles.label}>INVITATION CODE</Text>
          <TextInput style={styles.input} placeholder="e.g. RUN-882" placeholderTextColor="#555" value={code} onChangeText={setCode} autoCapitalize="characters" />
          <TouchableOpacity style={[styles.mainActionButton, {marginTop: 30, width: '100%'}]} onPress={() => onJoin(code)}>
            <Text style={styles.buttonText}>Join Club</Text>
          </TouchableOpacity>
        </GlassCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const ClubDetailScreen = ({ setCurrentScreen, club, isAdmin, onDeleteClub, onRemoveMember, onDeleteAnnouncement, onUpdateAnnouncement, onUpdatePrize }) => {
  const [activeTab, setActiveTab] = useState('Leaderboard'); 
  const [viewAsAdmin, setViewAsAdmin] = useState(isAdmin); 
  
  // FIX: Sync local toggle with actual Admin status when data loads
  useEffect(() => {
    if (isAdmin) setViewAsAdmin(true);
  }, [isAdmin]);
  
  // Modal States
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showClubConfirm, setShowClubConfirm] = useState(false);
  const [showAnnConfirm, setShowAnnConfirm] = useState(false);
  const [showMemberConfirm, setShowMemberConfirm] = useState(false);
  const [showPrizeEdit, setShowPrizeEdit] = useState(false);
  const [showEditAnnModal, setShowEditAnnModal] = useState(false); 
  
  // Data States
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [prizeText, setPrizeText] = useState(club.prizeMessage || "No prizes set.");
  const [targetAnn, setTargetAnn] = useState(null); 
  const [targetMemberEmail, setTargetMemberEmail] = useState(null);
  
  // Edit Announcement Form Data
  const [editAnnTitle, setEditAnnTitle] = useState('');
  const [editAnnBody, setEditAnnBody] = useState('');

  if (!club) return null;
  const rankedMembers = [...club.members].sort((a, b) => (b.miles || 0) - (a.miles || 0));

  const handleSendInvite = () => {
    const mockCode = `RUN-${Math.floor(100 + Math.random() * 900)}`;
    setInviteCode(mockCode);
  };

  const openEditAnnModal = (ann) => {
    setTargetAnn(ann);
    setEditAnnTitle(ann.title);
    setEditAnnBody(ann.body);
    setShowEditAnnModal(true);
  };

  const saveEditedAnnouncement = () => {
    if (targetAnn && editAnnTitle && editAnnBody) {
        onUpdateAnnouncement(club.id, targetAnn.id, editAnnTitle, editAnnBody);
        setShowEditAnnModal(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <TouchableOpacity onPress={() => setCurrentScreen('Clubs')} style={styles.backBtn}><Text style={styles.backBtnText}>← Back to Hub</Text></TouchableOpacity>
      <Text style={styles.greeting}>{club.name}</Text>
      
      <View style={styles.row}>
        <Text style={styles.subGreeting}>{viewAsAdmin ? 'Organizer Console' : 'Member View'}</Text>
        {isAdmin && (
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
            <Text style={{color: 'rgba(255,255,255,0.5)', fontSize: 12}}>Admin Mode</Text>
            <Switch trackColor={{ false: "#767577", true: "#ef4444" }} thumbColor={"#f4f3f4"} value={viewAsAdmin} onValueChange={setViewAsAdmin} />
          </View>
        )}
      </View>

      <View style={styles.tabContainer}>
        {['Leaderboard', 'Feed', 'Roster'].map(tab => (
          <TouchableOpacity key={tab} style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]} onPress={() => setActiveTab(tab)}><Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text></TouchableOpacity>
        ))}
      </View>

      {/* --- TAB 1: LEADERBOARD --- */}
      {activeTab === 'Leaderboard' && (
        <View>
          <GlassCard style={styles.prizeCard}><View style={styles.row}><Text style={styles.cardTitle}>🏆  MONTHLY PRIZES</Text>{viewAsAdmin && <TouchableOpacity onPress={() => setShowPrizeEdit(true)}><Text style={{color: '#3b82f6', fontWeight: 'bold'}}>Edit</Text></TouchableOpacity>}</View><Text style={styles.prizeText}>{club.prizeMessage || "Compete for the top spot."}</Text></GlassCard>
          <GlassCard><Text style={styles.label}>JANUARY STANDINGS</Text>{rankedMembers.map((m, i) => (<View key={i} style={styles.leaderboardItem}><View style={styles.row}><Text style={styles.rankText}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</Text><Text style={styles.shoeName}>{m.name}</Text></View><Text style={styles.historyMiles}>{m.miles || 0} mi</Text></View>))}</GlassCard>
        </View>
      )}

      {/* --- TAB 2: FEED --- */}
      {activeTab === 'Feed' && (
        <View>
           {viewAsAdmin && <TouchableOpacity style={[styles.secondaryActionButton, {marginBottom: 20}]} onPress={() => setCurrentScreen('AnnouncementComposer')}><Text style={styles.buttonText}>+ New Post</Text></TouchableOpacity>}
          {club.announcements.length === 0 && <Text style={{color:'rgba(255,255,255,0.4)', textAlign:'center'}}>No announcements yet.</Text>}
          {club.announcements.map((ann) => (
            <GlassCard key={ann.id} style={{padding: 18, marginBottom: 10}}>
              <View style={styles.row}>
                <View style={{flex: 1}}><Text style={styles.valueTitle}>{ann.title}</Text></View>
                {viewAsAdmin && (
                    <View style={{flexDirection: 'row', gap: 15}}>
                        <TouchableOpacity onPress={() => openEditAnnModal(ann)}><Text style={{color: '#3b82f6', fontWeight: 'bold'}}>Edit</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => { setTargetAnn(ann); setShowAnnConfirm(true); }}><Text style={{color: '#ef4444', fontWeight: 'bold'}}>Delete</Text></TouchableOpacity>
                    </View>
                )}
              </View>
              <Text style={[styles.valueDesc, {marginTop: 5}]}>{ann.body}</Text>
            </GlassCard>
          ))}
        </View>
      )}

      {/* --- TAB 3: ROSTER (With Delete Club) --- */}
      {activeTab === 'Roster' && (
        <View>
          {viewAsAdmin && <TouchableOpacity style={[styles.secondaryActionButton, {marginBottom: 20}]} onPress={() => { setInviteCode(''); setShowInviteModal(true); }}><Text style={styles.buttonText}>+ Invite Runners</Text></TouchableOpacity>}
          <GlassCard>
            <Text style={styles.label}>ADMINISTRATOR</Text><View style={styles.memberRow}><Text style={styles.valueTitle}>{club.admin}</Text></View><Text style={[styles.label, { marginTop: 30 }]}>MEMBERS ({club.members.length})</Text>
            {club.members.map((m, i) => (
              <View key={i} style={styles.memberDirectoryItem}>
                <View style={{ flex: 1, paddingRight: 15 }}> 
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={styles.valueTitle}>{m.name}</Text>
                    {!m.shareConsent && <Text style={{color: '#ef4444', fontSize: 10, fontWeight: 'bold', marginLeft: 8}}>🔒 PRIVATE</Text>}
                  </View>
                  <Text style={styles.valueDesc}>{(m.shareConsent || viewAsAdmin) ? m.email : '🔒 Contact Hidden'}</Text>
                  <Text style={styles.valueDesc}>{(m.shareConsent || viewAsAdmin) ? m.phone : ''}</Text>
                </View>
                {viewAsAdmin && (<TouchableOpacity style={styles.removeMemberBtn} onPress={() => { setTargetMemberEmail(m.email); setShowMemberConfirm(true); }}><Text style={styles.removeText}>Remove</Text></TouchableOpacity>)}
              </View>
            ))}

            {/* DELETE CLUB BUTTON (Moved Inside Card) */}
            {viewAsAdmin && (
              <TouchableOpacity 
                  style={{
                      marginTop: 40, 
                      paddingVertical: 15, 
                      borderWidth: 1, 
                      borderColor: '#ef4444', 
                      borderRadius: 12, 
                      alignItems: 'center',
                      backgroundColor: 'rgba(239, 68, 68, 0.05)'
                  }} 
                  onPress={() => setShowClubConfirm(true)}
              >
                  <Text style={{color: '#ef4444', fontWeight: 'bold', fontSize: 16}}>Delete Club</Text>
              </TouchableOpacity>
            )}
          </GlassCard>
        </View>
      )}

      {/* --- MODALS --- */}
      
      <Modal transparent visible={showEditAnnModal} animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <BlurView intensity={100} tint="dark" style={styles.confirmModal}>
                <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
                    <Text style={styles.modalTitle}>Edit Post</Text>
                    <Text style={styles.label}>TITLE</Text><TextInput style={styles.input} value={editAnnTitle} onChangeText={setEditAnnTitle} />
                    <Text style={styles.label}>BODY</Text><TextInput style={[styles.input, {minHeight: 100, textAlignVertical: 'top'}]} multiline value={editAnnBody} onChangeText={setEditAnnBody} />
                    <TouchableOpacity style={{marginTop: 20, backgroundColor: '#ef4444', paddingVertical: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 55}} onPress={saveEditedAnnouncement}><Text style={{color: '#FFFFFF', fontWeight: 'bold', fontSize: 16, zIndex: 10, textAlign: 'center'}}>Save Changes</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.cancelButton, {marginTop: 10}]} onPress={() => setShowEditAnnModal(false)}><Text style={styles.buttonText}>Cancel</Text></TouchableOpacity>
                </ScrollView>
            </BlurView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal transparent visible={showInviteModal} animationType="slide">
        <View style={styles.bottomSheetOverlay}>
          <BlurView intensity={95} tint="dark" style={styles.bottomSheetContent}>
            <Text style={styles.modalTitle}>Invite Runners</Text>
            {!inviteCode ? (
              <>
                <Text style={styles.label}>EMAIL ADDRESS</Text><TextInput style={styles.input} placeholder="runner@email.com" placeholderTextColor="#555" value={inviteEmail} onChangeText={setInviteEmail} keyboardType="email-address"/>
                <TouchableOpacity style={[styles.mainActionButton, {marginTop: 20}]} onPress={handleSendInvite}><Text style={styles.buttonText}>Send Invite</Text></TouchableOpacity>
              </>
            ) : (
              <View style={{alignItems:'center', marginVertical: 20}}><Text style={{color: '#22c55e', fontSize: 50, marginBottom: 10}}>✓</Text><Text style={styles.marketingBody}>Invitation Sent! Share this code:</Text><Text style={{color: 'white', fontSize: 32, fontWeight: 'bold', letterSpacing: 2}}>{inviteCode}</Text></View>
            )}
            <TouchableOpacity style={[styles.cancelButton, {marginTop: 10}]} onPress={() => setShowInviteModal(false)}><Text style={styles.buttonText}>Close</Text></TouchableOpacity>
          </BlurView>
        </View>
      </Modal>

      <Modal transparent visible={showPrizeEdit} animationType="slide"><View style={styles.bottomSheetOverlay}><BlurView intensity={95} tint="dark" style={styles.bottomSheetContent}><Text style={styles.modalTitle}>Set Prizes</Text><TextInput style={[styles.input, {minHeight: 100}]} multiline value={prizeText} onChangeText={setPrizeText}/><TouchableOpacity style={[styles.mainActionButton, {marginTop: 20}]} onPress={() => { onUpdatePrize(club.id, prizeText); setShowPrizeEdit(false); }}><Text style={styles.buttonText}>Save</Text></TouchableOpacity><TouchableOpacity style={[styles.cancelButton, {marginTop: 10}]} onPress={() => setShowPrizeEdit(false)}><Text style={styles.buttonText}>Cancel</Text></TouchableOpacity></BlurView></View></Modal>
      
      <Modal transparent visible={showMemberConfirm} animationType="fade">
        <View style={[styles.modalOverlay, { alignItems: 'center', justifyContent: 'center' }]}>
            <BlurView intensity={80} tint="dark" style={{ padding: 30, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', overflow: 'hidden', width: '85%', maxWidth: 400, alignItems: 'center' }}>
                <Text style={{fontSize: 24, fontWeight: '900', color: 'white', marginBottom: 15, textAlign: 'center'}}>Remove Runner?</Text>
                <TouchableOpacity style={styles.modalConfirmBtnRed} onPress={() => { setShowMemberConfirm(false); if(targetMemberEmail) onRemoveMember(club.id, targetMemberEmail); }}><Text style={styles.buttonText}>Confirm Remove</Text></TouchableOpacity>
                <TouchableOpacity style={{marginTop: 20}} onPress={() => setShowMemberConfirm(false)}><Text style={{color: 'rgba(255,255,255,0.5)', fontWeight: '600'}}>Cancel</Text></TouchableOpacity>
            </BlurView>
        </View>
      </Modal>

      {/* DELETE CLUB CONFIRMATION - Uses same industry standard modal */}
      <Modal transparent visible={showClubConfirm} animationType="fade">
          <View style={styles.modalOverlay}>
              <BlurView intensity={100} tint="dark" style={styles.confirmModal}>
                  <Text style={[styles.modalTitle, {color: '#ef4444'}]}>Delete Club?</Text>
                  <Text style={{color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 25, paddingHorizontal: 10, lineHeight: 22, fontSize: 15}}>
                      This action is permanent. All member data and announcements for this club will be lost.
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                      <TouchableOpacity 
                          style={{flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 16, borderRadius: 16, alignItems: 'center'}} 
                          onPress={() => setShowClubConfirm(false)}
                      >
                          <Text style={{color: 'white', fontWeight: 'bold', fontSize: 16}}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                          style={{flex: 1, backgroundColor: '#ef4444', paddingVertical: 16, borderRadius: 16, alignItems: 'center'}} 
                          onPress={() => { onDeleteClub(club.id); setShowClubConfirm(false); }}
                      >
                          <Text style={{color: 'white', fontWeight: 'bold', fontSize: 16}}>Delete</Text>
                      </TouchableOpacity>
                  </View>
              </BlurView>
          </View>
      </Modal>
      
      <Modal transparent visible={showAnnConfirm} animationType="fade">
          <View style={styles.modalOverlay}>
              <BlurView intensity={100} tint="dark" style={styles.confirmModal}>
                  <Text style={styles.modalTitle}>Delete Post?</Text>
                  <TouchableOpacity style={styles.modalConfirmBtnRed} onPress={() => { 
                      setShowAnnConfirm(false); 
                      if(targetAnn) onDeleteAnnouncement(club.id, targetAnn.id); 
                  }}>
                      <Text style={styles.buttonText}>Confirm Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalConfirmBtnSecondary, {marginTop: 20}]} onPress={() => setShowAnnConfirm(false)}>
                      <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
              </BlurView>
          </View>
      </Modal>
    </ScrollView>
  );
};

const AnnouncementComposer = ({ setCurrentScreen, club, onPost }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const handlePost = () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Missing Info", "Please enter both a title and a message body.");
      return;
    }
    onPost(club.id, title, body);
  };

  return (
    <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        keyboardShouldPersistTaps="handled" // 👈 INDUSTRY STANDARD FIX
    >
      <TouchableOpacity onPress={() => setCurrentScreen('ClubDetail')} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.greeting}>New Post</Text>
      <GlassCard style={{marginTop: 25}}>
        <Text style={styles.label}>TITLE *</Text>
        <TextInput 
            style={styles.input} 
            onChangeText={setTitle} 
            value={title} 
            placeholder="Run Title" 
            placeholderTextColor="#666" 
        />
        
        <Text style={styles.label}>BODY *</Text>
        <TextInput 
            style={[styles.input, {height: 100, textAlignVertical: 'top'}]} 
            multiline 
            onChangeText={setBody} 
            value={body} 
            placeholder="Details about the run..." 
            placeholderTextColor="#666" 
        />
        
        <TouchableOpacity style={[styles.mainActionButton, {marginTop: 30}]} onPress={handlePost}>
            <Text style={styles.buttonText}>Post Announcement</Text>
        </TouchableOpacity>

        <TouchableOpacity 
            style={[styles.secondaryActionButton, {marginTop: 15, borderStyle: 'solid'}]} 
            onPress={() => setCurrentScreen('ClubDetail')}
        >
            <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
      </GlassCard>
    </ScrollView>
  );
};

// --- HOME SCREEN (WITH REAL WEATHER) ---
const HomeScreen = ({ setCurrentScreen, shoes, userProfile, monthlyMiles, onLogout }) => {
  const [weather, setWeather] = useState({ temp: '--', condition: 'Loading...', city: 'Locating...', icon: '⏳' });

  useEffect(() => {
    (async () => {
      try {
        // 1. Request Permission & Get Location
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setWeather({ temp: '--', condition: 'Permission Denied', city: 'Location needed', icon: '🚫' });
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;

        // 2. Get City Name (Reverse Geocoding)
        let address = await Location.reverseGeocodeAsync({ latitude, longitude });
        const city = address[0]?.city || address[0]?.name || "Unknown";
        const region = address[0]?.region || "";

        // 3. Fetch Weather (Open-Meteo API - Free, No Key Required)
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=fahrenheit`
        );
        const data = await response.json();
        const { temperature, weathercode } = data.current_weather;

        // 4. Map Weather Codes to Icons
        let conditionText = "Clear";
        let icon = "☀️";
        
        // WMO Weather interpretation codes
        if (weathercode >= 1 && weathercode <= 3) { conditionText = "Partly Cloudy"; icon = "⛅"; }
        else if (weathercode >= 45 && weathercode <= 48) { conditionText = "Foggy"; icon = "🌫️"; }
        else if (weathercode >= 51 && weathercode <= 67) { conditionText = "Rain"; icon = "🌧️"; }
        else if (weathercode >= 71 && weathercode <= 77) { conditionText = "Snow"; icon = "❄️"; }
        else if (weathercode >= 80 && weathercode <= 82) { conditionText = "Showers"; icon = "🌦️"; }
        else if (weathercode >= 95) { conditionText = "Thunderstorm"; icon = "⛈️"; }

        setWeather({ 
          temp: Math.round(temperature), 
          condition: conditionText, 
          city: region ? `${city}, ${region}` : city, 
          icon: icon 
        });

      } catch (error) {
        console.error("Weather Error:", error);
        setWeather({ temp: '--', condition: 'Unavailable', city: 'Weather Error', icon: '⚠️' });
      }
    })();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.row, {marginBottom: 10, marginTop: 10}]}>
        <Text style={{color: 'white', fontWeight: '900', letterSpacing: 1, fontSize: 16}}>STRIDE 4 STRIDE</Text>
        <TouchableOpacity onPress={() => setCurrentScreen('Profile')} style={styles.profileIconBtn}><Text style={{fontSize: 20}}>👤</Text></TouchableOpacity>
      </View>
      
      <View style={styles.row}><View><Text style={styles.greeting}>Hello, {userProfile?.fullName?.split(' ')[0] || 'Runner'}</Text><Text style={styles.subGreeting}>Let's make progress today!</Text></View></View>
      
      {/* DYNAMIC WEATHER CARD */}
      <GlassCard style={styles.weatherMargin}>
        <Text style={styles.weatherText}>{weather.icon}  {weather.temp}° {weather.condition}</Text>
        <Text style={styles.weatherDetails}>{weather.city}</Text>
      </GlassCard>

      <View style={styles.buttonContainer}><TouchableOpacity style={styles.mainActionButton} onPress={() => setCurrentScreen('Log')}><Text style={styles.buttonText}>Log Run</Text></TouchableOpacity><TouchableOpacity style={styles.secondaryActionButton} onPress={() => setCurrentScreen('Clubs')}><Text style={styles.buttonText}>Clubs Hub</Text></TouchableOpacity></View>
      <GlassCard style={{ marginTop: 25 }}><View style={styles.row}><Text style={styles.cardTitle}>This Month</Text><TouchableOpacity onPress={() => setCurrentScreen('History')}><Text style={styles.manageLink}>History</Text></TouchableOpacity></View><Text style={styles.milesTotal}>{monthlyMiles} <Text style={{fontSize: 20, fontWeight: '400'}}>mi</Text></Text></GlassCard>
      <GlassCard><View style={styles.row}><Text style={styles.cardTitle}>Shoe Mileage</Text><TouchableOpacity onPress={() => setCurrentScreen('ManageShoes')}><Text style={styles.manageLink}>Manage</Text></TouchableOpacity></View>
        {shoes.filter(s => !s.retired).slice(0, 3).map(shoe => (<View key={shoe.id} style={styles.shoeItem}><Text style={styles.shoeName}>{shoe.name}</Text><View style={styles.progressBarBase}><View style={[styles.progressBarFill, { width: `${Math.min(((shoe.miles || 0)/shoe.limit)*100, 100)}%`, backgroundColor: '#3b82f6' }]} /></View><Text style={styles.shoeMiles}>{(shoe.miles || 0).toFixed(1)} / {shoe.limit} miles</Text></View>))}
      </GlassCard>
      
      <TouchableOpacity style={{ backgroundColor: 'white', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 40, marginBottom: 10 }} onPress={() => setCurrentScreen('JoinClub')}>
        <Text style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: 16 }}>Join a Club with Code</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}><Text style={styles.logoutText}>Log Out</Text></TouchableOpacity>
    </ScrollView>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null); 
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState({});
  const [currentScreen, setCurrentScreen] = useState('Home');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [runs, setRuns] = useState([]);
  
  // Initialize as empty arrays since we are using Firebase
  const [clubs, setClubs] = useState([]);
  const [shoeInventory, setShoeInventory] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);

  // Persistence Check
  useEffect(() => {
    const checkPersistence = async () => { const seen = await AsyncStorage.getItem('hasSeenOnboarding'); setHasSeenOnboarding(seen === 'true'); };
    checkPersistence();
    const unsub = onAuthStateChanged(auth, (usr) => { setUser(usr); if(usr) setHasSeenOnboarding(true); });
    return () => unsub();
  }, []);

  // --- SINGLE SOURCE OF TRUTH LISTENER ---
  useEffect(() => {
    if (!user) return;
    
    // User Profile Listener
    const profileUnsub = onSnapshot(doc(db, "users", user.uid), (doc) => { if(doc.exists()) setUserProfile(doc.data()); });
    
    // Runs Listener
    const runsUnsub = onSnapshot(query(collection(db, "runs"), where("userId", "==", user.uid), orderBy("createdAt", "desc")), (snapshot) => { setRuns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); });

    // CLUBS Listener
    const clubsUnsub = onSnapshot(collection(db, "clubs"), (snapshot) => {
        setClubs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // SHOES Listener
    const shoesUnsub = onSnapshot(query(collection(db, "shoes"), where("userId", "==", user.uid)), (snapshot) => {
        setShoeInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { profileUnsub(); runsUnsub(); clubsUnsub(); shoesUnsub(); };
  }, [user]);

  // --- SYNC SELECTED CLUB (MOVED HERE) ---
  useEffect(() => {
    if (selectedClub) {
      const liveVersion = clubs.find(c => c.id === selectedClub.id);
      if (liveVersion) {
        setSelectedClub(liveVersion);
      }
    }
  }, [clubs]);

  const monthlyMiles = runs.reduce((acc, curr) => acc + (curr.distance || 0), 0).toFixed(1);
  const shoesWithMiles = shoeInventory.map(shoe => {
    const loggedMiles = runs.filter(r => r.shoeId === shoe.id).reduce((acc, curr) => acc + (curr.distance || 0), 0);
    return { ...shoe, miles: (shoe.initialMiles || 0) + loggedMiles };
  });

  // Safe Actions
  const handleLogin = async (email, password) => { try { await signInWithEmailAndPassword(auth, email, password); } catch (e) { Alert.alert("Login Failed", e.message); } };
  
  // *** RE-RUN SAFE REGISTRATION ***
  const handleOnboardingRegister = async (email, password, fullName, phone) => {
    try {
      // Try to create the user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // If successful, write to database
      await setDoc(doc(db, "users", user.uid), { fullName, email, phone, shareConsent: true, createdAt: new Date() });
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      setHasSeenOnboarding(true);
      setToastMessage("Welcome to the Pack!"); setShowToast(true);
      
    } catch (e) {
      // If user already exists (testing), try logging them in instead!
      if (e.code === 'auth/email-already-in-use') {
         try {
            await signInWithEmailAndPassword(auth, email, password);
            await AsyncStorage.setItem('hasSeenOnboarding', 'true');
            setHasSeenOnboarding(true);
            setToastMessage("Account exists! Logging in..."); setShowToast(true);
         } catch (loginErr) {
            Alert.alert("Login Failed", "This email is taken, and the password didn't match 'runner123'.");
         }
      } else {
         Alert.alert("Registration Error", e.message);
      }
    }
  };
  
  const handleUpdateUser = async (updatedData) => { if(!user) return; await updateDoc(doc(db, "users", user.uid), updatedData); setCurrentScreen('Home'); };
  const handleLogout = async () => { await signOut(auth); setUser(null); setCurrentScreen('Home'); };
  const handleSaveRun = async (newRun) => { if (!user) return; await addDoc(collection(db, "runs"), { ...newRun, userId: user.uid, createdAt: new Date() }); };
  
  const handleUpdateRun = async (updatedRun) => { 
    if(!user) return; 
    try {
        await updateDoc(doc(db, "runs", updatedRun.id), { 
            distance: updatedRun.distance,
            date: updatedRun.date,
            shoe: updatedRun.shoe,
            shoeId: updatedRun.shoeId,
            club: updatedRun.club
        }); 
        setToastMessage("Run updated successfully."); 
        setShowToast(true);
    } catch(e) { Alert.alert("Error", e.message); }
  };

  const handleDeleteRun = async (runId) => { 
    if(!user) return; 
    try {
        await deleteDoc(doc(db, "runs", runId)); 
        setToastMessage("Run deleted."); 
        setShowToast(true);
    } catch(e) { Alert.alert("Error", e.message); }
  };

  // --- FIREBASE SHOE HANDLERS ---

  const handleAddShoe = async (name) => {
    try {
      await addDoc(collection(db, "shoes"), {
        userId: user.uid,
        name: name,
        initialMiles: 0,
        limit: 400,
        retired: false,
        createdAt: new Date()
      });
      setToastMessage("Shoe Added to Rotation");
      setShowToast(true);
    } catch (e) { Alert.alert("Error", e.message); }
  };

  const handleUpdateShoeName = async (id, newName) => {
    try {
      await updateDoc(doc(db, "shoes", id), { name: newName });
    } catch (e) { Alert.alert("Error", e.message); }
  };

  const handleDeleteShoe = async (id) => {
    try {
      await deleteDoc(doc(db, "shoes", id));
      setToastMessage("Shoe Retired");
      setShowToast(true);
    } catch (e) { Alert.alert("Error", e.message); }
  };

  const handleUpdatePrize = async (cId, text) => {
    try {
        await updateDoc(doc(db, "clubs", cId), { prizeMessage: text });
    } catch (e) { Alert.alert("Error", e.message); }
  };
  
  // --- FIREBASE CLUB HANDLERS (LIVE MODE) ---

// 1. UPDATED: Launch Club (Ensures Founder Status is saved forever)
  const handleLaunchClub = async (name) => {
    if (!user) return;
    try {
      // Create the Club
      await addDoc(collection(db, "clubs"), {
        name: name,
        admin: userProfile.fullName || 'Unknown Admin',
        adminId: user.uid,
        members: [{ 
            name: userProfile.fullName, 
            email: user.email, 
            phone: userProfile.phone || "", 
            miles: 0, 
            shareConsent: true 
        }],
        announcements: [],
        prizeMessage: "Welcome to the club! Set your prizes here.",
        createdAt: new Date()
      });

      // CRITICAL: Mark user as Founder in the database
      await updateDoc(doc(db, "users", user.uid), { isFounder: true });

      setCurrentScreen('Clubs');
      setToastMessage("Club Launched!");
      setShowToast(true);
    } catch (error) {
      Alert.alert("Error", "Could not create club: " + error.message);
    }
  };

// 2. NEW: Cancel Subscription
  const handleCancelSubscription = async () => {
    if (!user) return;
    try {
        await updateDoc(doc(db, "users", user.uid), { isFounder: false });
        setToastMessage("Subscription Cancelled");
        setShowToast(true);
        setCurrentScreen('Home'); // Redirect home after cancelling
    } catch (e) {
        Alert.alert("Error", e.message);
    }
  };

// 3. NEW: Unlock Founder (For the Sales Page button)
  const handleUnlockFounder = async () => {
      if(!user) return;
      await updateDoc(doc(db, "users", user.uid), { isFounder: true });
      setToastMessage("Unlocked! You are a Founder.");
      setShowToast(true);
  };

  const handleDeleteClub = async (id) => {
    try {
        await deleteDoc(doc(db, "clubs", id));
        setCurrentScreen('Clubs');
        setToastMessage("Club Deleted");
        setShowToast(true);
    } catch (e) { Alert.alert("Error", e.message); }
  };

  const handlePostAnnouncement = async (cId, title, body) => {
    try {
      const newAnn = { id: Date.now(), title, body };
      await updateDoc(doc(db, "clubs", cId), {
        announcements: arrayUnion(newAnn)
      });
      setCurrentScreen('ClubDetail');
      setToastMessage("Post sent to Database!");
      setShowToast(true);
    } catch (e) { Alert.alert("Firebase Error", e.message); }
  };

  const handleDeleteAnnouncement = async (cId, annId) => {
    try {
      const clubToUpdate = clubs.find(c => c.id === cId);
      if (!clubToUpdate) return;
      const updatedAnns = clubToUpdate.announcements.filter(a => a.id !== annId);
      await updateDoc(doc(db, "clubs", cId), { announcements: updatedAnns });
      setToastMessage("Post deleted from Database.");
      setShowToast(true);
    } catch (e) { Alert.alert("Error", e.message); }
  };

  const handleUpdateAnnouncement = async (cId, annId, newTitle, newBody) => {
    try {
        const clubToUpdate = clubs.find(c => c.id === cId);
        if (!clubToUpdate) return;
        const updatedAnns = clubToUpdate.announcements.map(a => 
            a.id === annId ? { ...a, title: newTitle, body: newBody } : a
        );
        await updateDoc(doc(db, "clubs", cId), { announcements: updatedAnns });
        setToastMessage("Post Updated in Database");
        setShowToast(true);
    } catch (e) { Alert.alert("Error", e.message); }
  };

  const handleRemoveMember = async (cId, email) => {
    try {
        const clubToUpdate = clubs.find(c => c.id === cId);
        if (!clubToUpdate) return;
        const updatedMembers = clubToUpdate.members.filter(m => m.email !== email);
        await updateDoc(doc(db, "clubs", cId), { members: updatedMembers });
        setToastMessage("Member Removed");
        setShowToast(true);
    } catch (e) { Alert.alert("Error", e.message); }
  };

  // --- JOIN CLUB (Transaction Method) ---
  const onJoinClub = async (code) => {
    if (!user || !code) return;
    try {
      const clubRef = doc(db, "clubs", code); // Using Club ID as code for now
      const clubSnap = await getDoc(clubRef);

      if (!clubSnap.exists()) {
        Alert.alert("Error", "Club not found. Please check the code.");
        return;
      }

      const clubData = clubSnap.data();
      const isMember = clubData.members.some(m => m.email === user.email);
      
      if (isMember) {
        Alert.alert("Notice", "You are already in this club!");
        return;
      }

      const newMember = {
        name: userProfile.fullName,
        email: user.email,
        phone: userProfile.phone || "",
        miles: 0,
        shareConsent: true
      };

      await updateDoc(clubRef, {
        members: arrayUnion(newMember)
      });

      setToastMessage("Welcome to the club!");
      setShowToast(true);
      setCurrentScreen('Clubs');

    } catch (e) {
      Alert.alert("Join Error", "Invalid code or network issue.");
    }
  };

  if (hasSeenOnboarding === null) return <View style={{flex:1, backgroundColor: '#000'}}><ActivityIndicator size="large" color="#fff" /></View>;
  if (!user) return hasSeenOnboarding ? <LoginScreen onLogin={handleLogin} /> : <OnboardingFlow onRegister={handleOnboardingRegister} />;
  
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#991b1b', '#000000', '#1e3a8a']} locations={[0, 0.5, 1]} style={styles.background} />
      <SafeAreaView style={{ flex: 1 }}>
        
        {/* Screen: Home */}
        {currentScreen === 'Home' && <HomeScreen setCurrentScreen={setCurrentScreen} shoes={shoesWithMiles} userProfile={userProfile} monthlyMiles={monthlyMiles} onLogout={handleLogout} />}
        
        {/* Screen: Profile */}
{currentScreen === 'Profile' && (
  <ProfileScreen 
    setCurrentScreen={setCurrentScreen} 
    userProfile={userProfile} 
    onUpdateUser={handleUpdateUser} 
    onCancelSubscription={handleCancelSubscription} // <--- PASS THIS
  />
)}
        
        {/* Screen: Log Run */}
        {currentScreen === 'Log' && <LogPage setCurrentScreen={setCurrentScreen} shoes={shoesWithMiles} onSaveRun={handleSaveRun} setToastMessage={setToastMessage} setShowToast={setShowToast} />}
        
        {/* Screen: History */}
        {currentScreen === 'History' && <HistoryScreen setCurrentScreen={setCurrentScreen} runs={runs} shoes={shoesWithMiles} onDeleteRun={handleDeleteRun} onUpdateRun={handleUpdateRun} />}
        
        {/* Screen: Manage Shoes (ADDED onDeleteShoe HERE) */}
        {currentScreen === 'ManageShoes' && (
          <ManageShoesScreen 
            setCurrentScreen={setCurrentScreen} 
            shoes={shoesWithMiles} 
            onUpdateShoeName={handleUpdateShoeName} 
            onDeleteShoe={handleDeleteShoe}
            onAddShoe={handleAddShoe} // 👈 ADD THIS LINE
          />
        )}
        
       {/* Screen: Clubs Hub */}
        {currentScreen === 'Clubs' && (
  <ClubsScreen 
    setCurrentScreen={setCurrentScreen} 
    clubs={clubs} 
    onSelectClub={(c) => { setSelectedClub(c); setCurrentScreen('ClubDetail'); }}
    userProfile={userProfile}       // <--- PASS THIS
    onUnlockFounder={handleUnlockFounder} // <--- PASS THIS
  />
)}
        {currentScreen === 'CreateClub' && <CreateClubScreen setCurrentScreen={setCurrentScreen} onLaunch={handleLaunchClub} />}
        {currentScreen === 'JoinClub' && <JoinClubScreen setCurrentScreen={setCurrentScreen} onJoin={onJoinClub} />}
        
        {/* Screen: Club Detail (Console) */}
        {currentScreen === 'ClubDetail' && (
          <ClubDetailScreen 
            setCurrentScreen={setCurrentScreen} 
            club={selectedClub} 
            isAdmin={selectedClub?.adminId === user?.uid} 
            onDeleteClub={handleDeleteClub} 
            onRemoveMember={handleRemoveMember} 
            onDeleteAnnouncement={handleDeleteAnnouncement} 
            onUpdateAnnouncement={handleUpdateAnnouncement} 
            onUpdatePrize={handleUpdatePrize} 
          />
        )}
        
        {/* Screen: Create Post */}
        {currentScreen === 'AnnouncementComposer' && <AnnouncementComposer setCurrentScreen={setCurrentScreen} club={selectedClub} onPost={handlePostAnnouncement} />}
        
        <Toast message={toastMessage} visible={showToast} onHide={() => setShowToast(false)} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  scrollContent: { padding: 24 }, greeting: { fontSize: 36, fontWeight: '900', color: 'white', marginTop: 10 },
  subGreeting: { fontSize: 18, color: 'rgba(255,255,255,0.5)', marginBottom: 10 },
  cardWrapper: { marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 15 },
  glass: { padding: 24, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  buttonContainer: { flexDirection: 'row', gap: 12, marginTop: 10 },
  mainActionButton: { backgroundColor: '#ef4444', paddingVertical: 18, borderRadius: 16, flex: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryActionButton: { backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 18, borderRadius: 16, flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtnText: { color: '#ef4444', fontWeight: 'bold' },
  label: { color: 'white', fontSize: 10, fontWeight: '900', opacity: 0.4, marginTop: 20, marginBottom: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', padding: 18, borderRadius: 16, color: 'white', marginBottom: 5 },
  privacyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 30, paddingTop: 30, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  valueTitle: { color: 'white', fontSize: 17, fontWeight: '700' },
  valueDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  milesTotal: { color: 'white', fontSize: 56, fontWeight: '900', marginVertical: 10 },
  cardTitle: { color: 'white', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', opacity: 0.6 },
  shoeName: { color: 'white', fontSize: 18, fontWeight: '700' },
  shoeItem: { marginTop: 18 }, shoeMiles: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 5 },
  progressBarBase: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, marginTop: 8 },
  progressBarFill: { height: '100%', borderRadius: 4 },
  profileIconBtn: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  weatherMargin: { marginTop: 20, marginBottom: 10 },
  weatherText: { fontSize: 28, fontWeight: 'bold', color: 'white' }, weatherDetails: { color: 'white', opacity: 0.6 },
  manageLink: { color: '#ef4444', fontWeight: 'bold' },
  onboardingContainer: { flex: 1, justifyContent: 'center' },
  onboardingContent: { flex: 1, padding: 30, justifyContent: 'space-between' },
  onboardingScrollContent: { flexGrow: 1, justifyContent: 'center', padding: 30 },
  skipBtn: { position: 'absolute', top: 60, right: 30, zIndex: 10 },
  skipText: { color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' },
  onboardingTitle: { fontSize: 42, fontWeight: '900', color: 'white', textAlign: 'center', marginBottom: 15 },
  onboardingSub: { fontSize: 18, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 26 },
  indicatorRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.2)' },
  activeDot: { backgroundColor: '#ef4444' },
  onboardingBtn: { backgroundColor: '#ef4444', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 25, alignSelf: 'center', marginTop: 20 },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 5, fontWeight: 'bold' },
  logoutBtn: { marginTop: 40, marginBottom: 40, alignSelf: 'center', padding: 10 },
  logoutText: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 },
  toastContainer: { position: 'absolute', top: 50, left: 20, right: 20, alignItems: 'center', zIndex: 999 },
  toastGlass: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 25, overflow: 'hidden', backgroundColor: 'rgba(20,20,20,0.8)' },
  toastText: { color: '#4ade80', fontWeight: 'bold', fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.85)', padding: 30 },
  confirmModal: { padding: 30, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { color: 'white', fontSize: 24, fontWeight: '900', marginBottom: 15, textAlign: 'center' },
  bottomSheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.8)' },
  bottomSheetContent: { padding: 30, borderTopLeftRadius: 40, borderTopRightRadius: 40, minHeight: 450 },
  handleBar: { width: 50, height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
  clubItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 22, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  clubItemSelected: { borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  clubItemText: { color: 'white', fontSize: 17, fontWeight: '700' },
  checkMark: { color: '#ef4444', fontSize: 22, fontWeight: 'bold' },
  premiumBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 15, backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  premiumBadgeText: { color: '#ef4444', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  valueRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  valueIcon: { fontSize: 26 },
  pricingContainer: { marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 25 },
  priceText: { color: 'white', fontSize: 34, fontWeight: '900', textAlign: 'center', marginBottom: 15 },
  monthText: { fontSize: 16, fontWeight: '400', opacity: 0.5 },
  addCircleBtn: { backgroundColor: '#ef4444', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  leaderboardItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  rankText: { fontSize: 20, marginRight: 15, color: 'white', width: 30 },
  historyMiles: { color: 'white', fontSize: 20, fontWeight: '900' },
  prizeCard: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' },
  prizeText: { color: 'white', fontSize: 16, lineHeight: 24, marginTop: 10, fontStyle: 'italic' },
  cancelButton: { backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  memberDirectoryItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' },
  removeMemberBtn: { padding: 8, borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  removeText: { color: '#ef4444', fontSize: 12, fontWeight: 'bold' },
  deleteClubBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 40, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, padding: 4, marginBottom: 20, marginTop: 15 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  tabBtnActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  tabText: { color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', fontSize: 13 },
  tabTextActive: { color: 'white' },
  filterPill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 10 },
  filterPillActive: { backgroundColor: '#ef4444' },
  filterText: { color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' },
  filterTextActive: { color: 'white' },
});