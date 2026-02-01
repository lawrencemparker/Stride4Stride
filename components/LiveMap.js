// components/LiveMap.js (PHONE VERSION)
import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';

export default function LiveMap({ location, routeCoordinates }) {
  return (
    <MapView 
      style={StyleSheet.absoluteFill} 
      region={location} 
      showsUserLocation={true} 
      userInterfaceStyle="dark"
    >
      <Polyline 
        coordinates={routeCoordinates} 
        strokeWidth={5} 
        strokeColor="#ef4444" 
      />
    </MapView>
  );
}