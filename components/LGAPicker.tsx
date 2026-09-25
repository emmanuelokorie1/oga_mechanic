import React, { useState, useMemo, useCallback, memo, useEffect } from 'react'
import { View, Text, TouchableOpacity, Modal, FlatList, TextInput } from 'react-native'
import { XMarkIcon, CheckCircleIcon, MagnifyingGlassIcon } from 'react-native-heroicons/outline'
import { getCitiesByState } from '@/constants/locationData'

interface LGAPickerProps {
  selectedLGA: string
  onLGAChange: (lga: string) => void
  showLGAPicker?: boolean
  onLGAPickerToggle?: (show: boolean) => void
  state?: string
  country?: string
}

const LGAPicker: React.FC<LGAPickerProps> = ({
  selectedLGA,
  onLGAChange,
  showLGAPicker = false,
  onLGAPickerToggle,
  state,
  country
}) => {
  const [localShowLGAPicker, setLocalShowLGAPicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')

  // Debounce search query for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300) // 300ms delay

    return () => clearTimeout(timer)
  }, [searchQuery])

  const isControlled = onLGAPickerToggle !== undefined

  const showLGA = isControlled ? showLGAPicker : localShowLGAPicker

  const setShowLGA = (show: boolean) => {
    if (isControlled) {
      onLGAPickerToggle?.(show)
    } else {
      setLocalShowLGAPicker(show)
    }
  }

  // Get LGAs based on state and country using our lightweight data
  const lgas = useMemo(() => {
    if (!state || !country) {
      return []
    }

    // Use our lightweight data
    const cities = getCitiesByState(country, state)
    if (cities.length > 0) {
      return cities
    }
    
    // Fallback for Nigeria if package fails
    if (country === 'NG') {
      
      // Lagos LGAs
      if (state.toLowerCase().includes('lagos')) {
        return [
          'Agege', 'Ajeromi-Ifelodun', 'Alimosho', 'Amuwo-Odofin', 'Apapa',
          'Badagry', 'Epe', 'Eti-Osa', 'Ibeju-Lekki', 'Ifako-Ijaiye',
          'Ikeja', 'Ikorodu', 'Kosofe', 'Lagos Island', 'Lagos Mainland',
          'Mushin', 'Ojo', 'Oshodi-Isolo', 'Shomolu', 'Surulere'
        ]
      }

      // Abuja LGAs
      if (state.toLowerCase().includes('abuja') || state.toLowerCase().includes('fct')) {
        return [
          'Abaji', 'Bwari', 'Gwagwalada', 'Kuje', 'Kwali', 'Municipal Area Council'
        ]
      }

      // Rivers LGAs
      if (state.toLowerCase().includes('rivers')) {
        return [
          'Abua/Odual', 'Ahoada East', 'Ahoada West', 'Akuku-Toru', 'Andoni',
          'Asari-Toru', 'Bonny', 'Degema', 'Eleme', 'Emohua',
          'Etche', 'Gokana', 'Ikwerre', 'Khana', 'Obio/Akpor',
          'Ogba/Egbema/Ndoni', 'Ogu/Bolo', 'Okrika', 'Omuma', 'Opobo/Nkoro',
          'Oyigbo', 'Port Harcourt', 'Tai'
        ]
      }

      // Kano LGAs
      if (state.toLowerCase().includes('kano')) {
        return [
          'Ajingi', 'Albasu', 'Bagwai', 'Bebeji', 'Bichi', 'Bunkure',
          'Dala', 'Dambatta', 'Dawakin Kudu', 'Dawakin Tofa', 'Doguwa',
          'Fagge', 'Gabasawa', 'Garko', 'Garun Mallam', 'Gaya',
          'Gezawa', 'Gwale', 'Gwarzo', 'Kabo', 'Kano Municipal',
          'Karaye', 'Kibiya', 'Kiru', 'Kumbotso', 'Kunchi',
          'Kura', 'Madobi', 'Makoda', 'Minjibir', 'Nasarawa',
          'Rano', 'Rimin Gado', 'Rogo', 'Shanono', 'Sumaila',
          'Takai', 'Tarauni', 'Tofa', 'Tsanyawa', 'Tudun Wada',
          'Ungogo', 'Warawa', 'Wudil'
        ]
      }

      // Delta LGAs
      if (state.toLowerCase().includes('delta')) {
        return [
          'Aniocha North', 'Aniocha South', 'Bomadi', 'Burutu', 'Ethiope East',
          'Ethiope West', 'Ika North East', 'Ika South', 'Isoko North', 'Isoko South',
          'Ndokwa East', 'Ndokwa West', 'Okpe', 'Oshimili North', 'Oshimili South',
          'Patani', 'Sapele', 'Udu', 'Ughelli North', 'Ughelli South',
          'Ukwuani', 'Uvwie', 'Warri North', 'Warri South', 'Warri South West'
        ]
      }

      // Ogun LGAs
      if (state.toLowerCase().includes('ogun')) {
        return [
          'Abeokuta North', 'Abeokuta South', 'Ado-Odo/Ota', 'Egbado North', 'Egbado South',
          'Ewekoro', 'Ifo', 'Ijebu East', 'Ijebu North', 'Ijebu North East',
          'Ijebu Ode', 'Ikenne', 'Imeko Afon', 'Ipokia', 'Obafemi Owode',
          'Odeda', 'Odogbolu', 'Ogun Waterside', 'Remo North', 'Shagamu'
        ]
      }

      // Oyo LGAs
      if (state.toLowerCase().includes('oyo')) {
        return [
          'Afijio', 'Akinyele', 'Atiba', 'Atisbo', 'Egbeda', 'Ibadan North',
          'Ibadan North-East', 'Ibadan North-West', 'Ibadan South-East', 'Ibadan South-West',
          'Ibarapa Central', 'Ibarapa East', 'Ibarapa North', 'Ido', 'Irepo',
          'Iseyin', 'Itesiwaju', 'Iwajowa', 'Kajola', 'Lagelu',
          'Ogbomoso North', 'Ogbomoso South', 'Ogo Oluwa', 'Olorunsogo', 'Oluyole',
          'Ona Ara', 'Orelope', 'Ori Ire', 'Oyo', 'Oyo East',
          'Saki East', 'Saki West', 'Surulere'
        ]
      }

      // Enugu LGAs
      if (state.toLowerCase().includes('enugu')) {
        return [
          'Aninri', 'Awgu', 'Enugu East', 'Enugu North', 'Enugu South',
          'Ezeagu', 'Igbo Etiti', 'Igbo Eze North', 'Igbo Eze South', 'Igbo Eze South',
          'Isi Uzo', 'Nkanu East', 'Nkanu West', 'Nsukka', 'Oji River',
          'Udi', 'Uzo Uwani'
        ]
      }

      // Kaduna LGAs
      if (state.toLowerCase().includes('kaduna')) {
        return [
          'Birnin Gwari', 'Chikun', 'Giwa', 'Igabi', 'Ikara', 'Jaba', 'Jema\'a',
          'Kachia', 'Kaduna North', 'Kaduna South', 'Kagarko', 'Kajuru', 'Kaura',
          'Kauru', 'Kubau', 'Kudan', 'Lere', 'Makarfi', 'Sabon Gari', 'Sanga',
          'Soba', 'Zangon Kataf', 'Zaria'
        ]
      }
    }

    // Fallback for other countries
    
    // US States
    if (country === 'US') {
      if (state.toLowerCase().includes('california')) {
        return [
          'Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'Oakland',
          'Fresno', 'Long Beach', 'Bakersfield', 'Anaheim', 'Santa Ana',
          'Riverside', 'Stockton', 'Irvine', 'Chula Vista', 'Fremont'
        ]
      }
      if (state.toLowerCase().includes('texas')) {
        return [
          'Houston', 'San Antonio', 'Dallas', 'Austin', 'Fort Worth',
          'El Paso', 'Arlington', 'Corpus Christi', 'Plano', 'Lubbock',
          'Laredo', 'Garland', 'Frisco', 'McKinney', 'Grand Prairie'
        ]
      }
      if (state.toLowerCase().includes('new york')) {
        return [
          'New York City', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse',
          'Albany', 'New Rochelle', 'Mount Vernon', 'Schenectady', 'Utica',
          'White Plains', 'Hempstead', 'Troy', 'Niagara Falls', 'Binghamton'
        ]
      }
    }

    // UK Counties
    if (country === 'GB') {
      if (state.toLowerCase().includes('england')) {
        return [
          'London', 'Birmingham', 'Manchester', 'Liverpool', 'Leeds',
          'Sheffield', 'Bristol', 'Newcastle', 'Nottingham', 'Leicester',
          'Coventry', 'Bradford', 'Cardiff', 'Belfast', 'Edinburgh'
        ]
      }
    }

    // Generic fallback for any country/state
    return [
      'Central District', 'North District', 'South District', 'East District', 'West District',
      'Urban Area', 'Rural Area', 'Main City', 'Suburban Area', 'Industrial Zone',
      'Commercial District', 'Residential Area', 'Downtown', 'Uptown', 'City Center'
    ]
  }, [state, country])

  const filteredLGAs = useMemo(() => {
    if (!debouncedSearchQuery) return lgas.slice(0, 20) // Limit initial load for better performance
    return lgas.filter((lga: string) => 
      lga.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    )
  }, [lgas, debouncedSearchQuery])

  const handleLGASelect = useCallback((lga: string) => {
    onLGAChange(lga)
    setShowLGA(false)
    setSearchQuery('')
  }, [onLGAChange, setShowLGA])

  return (
    <Modal
      visible={showLGA}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowLGA(false)}
    >
      <View className="flex-1 bg-black/50">
        <View className="flex-1 mt-20 bg-white rounded-t-3xl">
          {/* Header */}
          <View className="flex-row items-center justify-between p-6 border-b border-gray-200">
            <Text className="text-xl font-bold text-gray-900">
              Select LGA
            </Text>
            <TouchableOpacity onPress={() => setShowLGA(false)}>
              <XMarkIcon size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View className="p-6 border-b border-gray-100">
            <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
              <MagnifyingGlassIcon size={20} color="gray" />
              <TextInput
                placeholder="Search LGAs..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 ml-2 text-[14px] font-NunitoMedium text-gray-900"
              />
            </View>
          </View>

          {/* LGA List */}
          <FlatList
            data={filteredLGAs}
            keyExtractor={(item) => item}
            initialNumToRender={10}
            maxToRenderPerBatch={5}
            windowSize={10}
            removeClippedSubviews={true}
            updateCellsBatchingPeriod={50}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleLGASelect(item)}
                className={`p-4 border-b border-gray-100 ${
                  selectedLGA === item ? 'bg-red-50' : ''
                }`}
                activeOpacity={0.7}
                delayPressIn={0}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-base font-medium text-gray-900">{item}</Text>
                  {selectedLGA === item && (
                    <CheckCircleIcon size={24} color="#EF4444" />
                  )}
                </View>
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="p-8 items-center">
                <Text className="text-gray-500 text-center">
                  {state ? `No LGAs found for ${state}` : 'Please select a state first'}
                </Text>
                <Text className="text-xs text-gray-400 mt-2">
                  Debug: State: {state}, Country: {country}, LGAs: {lgas.length}
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  )
}

export default LGAPicker