/**
 * Add Lead Screen - Complete Implementation
 * Form for creating new leads with real API integration
 */
import React from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  Text,
  Card,
  Portal,
  Modal,
  List,
  Divider,
  Banner,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from 'react-native-paper';
import Toast from 'react-native-toast-message';

// Internal imports
import ScreenContainer from '../../components/common/ScreenContainer';
import AppTextInput from '../../components/common/AppTextInput';
import AppButton from '../../components/common/AppButton';
import { useConnectivity } from '@contexts/ConnectivityContext';
import { useCreateLeadMutation } from '../../store/api/leadApi';
import { useGetActiveServicesQuery } from '../../store/api/servicesApi';
import {
  validateAddLeadForm,
  validators,
  NewLeadFormData,
  defaultLeadFormValues,
  indianStates,
} from '../../validation/leadSchema';
import type { HomeStackParamList } from '../../navigation/types';

type AddLeadScreenNavigation = NativeStackNavigationProp<
  HomeStackParamList,
  'AddLead'
>;

/**
 * Phone validation utility (reusing LoginScreen pattern)
 */
const validatePhone = (phoneNumber: string): boolean => {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phoneNumber);
};

/**
 * Format phone number input (reusing LoginScreen pattern)
 */
const handlePhoneChange = (text: string) => {
  const cleaned = text.replace(/\D/g, '');
  return cleaned.slice(0, 10);
};

/**
 * Format PIN code input
 */
const handlePinCodeChange = (text: string) => {
  const cleaned = text.replace(/\D/g, '');
  return cleaned.slice(0, 6);
};

/**
 * State Selector Modal Component
 */
const StateSelector: React.FC<{
  visible: boolean;
  onDismiss: () => void;
  onSelect: (state: string) => void;
  currentState?: string;
}> = ({ visible, onDismiss, onSelect, currentState }) => {
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Text variant="headlineSmall" style={styles.modalTitle}>
          Select State
        </Text>
        <ScrollView style={styles.modalScrollView}>
          {indianStates.map((state) => (
            <List.Item
              key={state}
              title={state}
              onPress={() => {
                onSelect(state);
                onDismiss();
              }}
              style={[
                styles.stateItem,
                currentState === state && styles.selectedStateItem,
              ]}
              titleStyle={
                currentState === state ? styles.selectedStateText : undefined
              }
            />
          ))}
        </ScrollView>
      </Modal>
    </Portal>
  );
};

/**
 * Services Selector Modal Component
 */
const ServicesSelector: React.FC<{
  visible: boolean;
  onDismiss: () => void;
  selectedServices: string[];
  onToggleService: (serviceId: string, serviceName: string) => void;
}> = ({ visible, onDismiss, selectedServices, onToggleService }) => {
  const {
    data: servicesResponse,
    isLoading,
    error,
  } = useGetActiveServicesQuery({});

  const services = servicesResponse?.data?.items || [];

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Text variant="headlineSmall" style={styles.modalTitle}>
          Select Services
        </Text>
        <ScrollView style={styles.modalScrollView}>
          {isLoading && (
            <Text style={styles.loadingText}>Loading services...</Text>
          )}
          {error && (
            <Text style={styles.errorText}>Failed to load services</Text>
          )}
          {services.map((service) => (
            <List.Item
              key={service.serviceId}
              title={service.name}
              // description={service.description}
              onPress={() => onToggleService(service.serviceId, service.name)}
              right={() =>
                selectedServices.includes(service.serviceId) ? (
                  <Text style={styles.checkMark}>✓</Text>
                ) : null
              }
              style={styles.serviceItem}
            />
          ))}
        </ScrollView>
        <View style={styles.modalButtonContainer}>
          <AppButton
            mode="contained"
            onPress={onDismiss}
            style={styles.modalDoneButton}
            title="Done"
            compact={true}
          />
        </View>
      </Modal>
    </Portal>
  );
};

/**
 * Add Lead Screen Component
 */
const AddLeadScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<AddLeadScreenNavigation>();
  const { isOnline } = useConnectivity();

  // RTK Query mutation
  const [createLead, { isLoading: isCreating }] = useCreateLeadMutation();

  // Form state
  const [formData, setFormData] = React.useState<
    NewLeadFormData & {
      selectedServiceNames: string[]; // Store service names for display
    }
  >({
    ...defaultLeadFormValues,
    selectedServiceNames: [],
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [showStateModal, setShowStateModal] = React.useState(false);
  const [showServicesModal, setShowServicesModal] = React.useState(false);
  const [showOfflineBanner, setShowOfflineBanner] = React.useState(false);

  /**
   * Update form field and clear its error
   */
  const updateField = <K extends keyof NewLeadFormData>(
    field: K,
    value: NewLeadFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  /**
   * Validate individual field on blur
   */
  const validateField = (field: keyof NewLeadFormData) => {
    let error: string | null = null;

    switch (field) {
      case 'customerName':
        error = validators.customerName(formData.customerName);
        break;
      case 'phone':
        error = validators.phone(formData.phone);
        break;
      case 'email':
        error = validators.email(formData.email);
        break;
      case 'address':
        error = validators.address(formData.address);
        break;
      case 'state':
        error = validators.state(formData.state);
        break;
      case 'pinCode':
        error = validators.pinCode(formData.pinCode);
        break;
    }

    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  /**
   * Validate entire form
   */
  const validateForm = (): boolean => {
    const validationErrors = validateAddLeadForm(formData);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    // Check online status first
    if (!isOnline) {
      setShowOfflineBanner(true);
      setTimeout(() => setShowOfflineBanner(false), 5000);
      return;
    }

    if (!validateForm()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fix the errors in the form before submitting.',
      });
      return;
    }

    try {
      console.log('📝 Submitting new lead...');

      // ✅ Prepare API payload matching real backend format
      const leadPayload = {
        customerName: formData.customerName,
        phone: formData.phone,
        address: `${formData.address}, ${formData.state} ${formData.pinCode}`, // ✅ Combined address
        services: formData.services || [], // ✅ Array of serviceIds
      };

      console.log('🚀 Lead payload:', leadPayload);

      // ✅ Call real API
      const response = await createLead(leadPayload).unwrap();

      console.log('✅ Lead created successfully:', response);

      // ✅ Show success toast
      Toast.show({
        type: 'success',
        text1: 'Lead Created',
        text2: `Lead ${response.data.leadId} created successfully!`,
      });

      // ✅ Navigate to LeadDetail screen
      // Note: Uncomment when LeadDetail screen is ready
      // navigation.navigate('LeadDetail', { leadId: response.data.leadId });

      // ✅ For now, navigate back to MyLeads
      setTimeout(() => {
        navigation.goBack();
      }, 1000);
      // navigation.goBack();
    } catch (error: any) {
      console.error('❌ Failed to create lead:', error);

      let errorMessage = 'Failed to create lead. Please try again.';

      // Handle specific error cases
      if (error.status === 409) {
        errorMessage =
          'Phone number already exists. Please use a different number.';
      } else if (error.status >= 400 && error.status < 500) {
        errorMessage = error.data?.message || 'Invalid data provided.';
      } else if (error.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: errorMessage,
      });
    }
  };

  /**
   * Handle service selection
   */
  const toggleService = (serviceId: string, serviceName: string) => {
    const currentServices = formData.services || [];
    const currentNames = formData.selectedServiceNames || [];

    if (currentServices.includes(serviceId)) {
      // Remove service
      updateField(
        'services',
        currentServices.filter((s) => s !== serviceId)
      );
      setFormData((prev) => ({
        ...prev,
        selectedServiceNames: currentNames.filter(
          (name) => name !== serviceName
        ),
      }));
    } else {
      // Add service
      updateField('services', [...currentServices, serviceId]);
      setFormData((prev) => ({
        ...prev,
        selectedServiceNames: [...currentNames, serviceName],
      }));
    }
  };

  /**
   * Check if form is valid for enabling save button
   */
  const isFormValid = React.useMemo(() => {
    const validationErrors = validateAddLeadForm(formData);
    return Object.keys(validationErrors).length === 0;
  }, [formData]);

  /**
   * Remove service by name
   */
  const removeServiceByName = (serviceName: string) => {
    const currentServices = formData.services || [];
    const currentNames = formData.selectedServiceNames || [];

    // Find the index of the service name to remove
    const nameIndex = currentNames.findIndex((name) => name === serviceName);

    if (nameIndex !== -1) {
      // Remove both serviceId and serviceName
      const newServices = [...currentServices];
      const newNames = [...currentNames];

      newServices.splice(nameIndex, 1);
      newNames.splice(nameIndex, 1);

      updateField('services', newServices);
      setFormData((prev) => ({
        ...prev,
        selectedServiceNames: newNames,
      }));
    }
  };

  return (
    <ScreenContainer>
      {/* Offline Banner */}
      <Banner
        visible={showOfflineBanner}
        actions={[
          {
            label: 'Dismiss',
            onPress: () => setShowOfflineBanner(false),
          },
        ]}
        // icon="wifi-off"
      >
        Go online to create a lead
      </Banner>

      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={20}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            Add New Lead
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Enter customer details to create a new lead
          </Text>
        </View>

        {/* Form Fields */}
        <Card style={styles.formCard}>
          <Card.Content>
            {/* Customer Name */}
            <AppTextInput
              label="Customer Name"
              placeholder="Enter customer name"
              value={formData.customerName}
              onChangeText={(text) => updateField('customerName', text.trim())}
              onBlur={() => validateField('customerName')}
              error={errors.customerName}
              variant="outlined"
              autoCapitalize="words"
              style={styles.input}
            />

            {/* Phone Number */}
            <AppTextInput
              label="Phone Number"
              placeholder="Enter your phone number"
              value={formData.phone}
              onChangeText={(text) =>
                updateField('phone', handlePhoneChange(text))
              }
              onBlur={() => validateField('phone')}
              error={
                formData.phone &&
                formData.phone.length > 0 &&
                !validatePhone(formData.phone)
                  ? 'Please enter a valid 10-digit phone number'
                  : errors.phone
              }
              keyboardType="phone-pad"
              maxLength={10}
              variant="outlined"
              style={styles.input}
            />

            {/* Email */}
            <AppTextInput
              label="Email Address"
              placeholder="Enter email address (optional)"
              value={formData.email}
              onChangeText={(text) => updateField('email', text.trim())}
              onBlur={() => validateField('email')}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              variant="outlined"
              style={styles.input}
            />

            {/* Address */}
            <AppTextInput
              label="Address"
              placeholder="Enter complete address"
              value={formData.address}
              onChangeText={(text) => updateField('address', text)}
              onBlur={() => validateField('address')}
              error={errors.address}
              multiline
              numberOfLines={3}
              variant="outlined"
              style={styles.input}
            />

            {/* State Selector */}
            <View style={styles.input}>
              <TouchableOpacity onPress={() => setShowStateModal(true)}>
                <AppTextInput
                  label="State"
                  placeholder="Select state"
                  value={formData.state}
                  editable={false}
                  error={errors.state}
                  variant="outlined"
                  right="chevron-down"
                  pointerEvents="none"
                />
              </TouchableOpacity>
            </View>

            {/* PIN Code */}
            <AppTextInput
              label="PIN Code"
              placeholder="Enter 6-digit PIN code"
              value={formData.pinCode}
              onChangeText={(text) =>
                updateField('pinCode', handlePinCodeChange(text))
              }
              onBlur={() => validateField('pinCode')}
              error={errors.pinCode}
              keyboardType="number-pad"
              maxLength={6}
              variant="outlined"
              style={styles.input}
            />

            {/* Services */}
            <View style={styles.input}>
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                Services Interested
              </Text>
              <View style={styles.servicesContainer}>
                {formData.selectedServiceNames &&
                formData.selectedServiceNames.length > 0 ? (
                  <View style={styles.selectedServices}>
                    {formData.selectedServiceNames.map((serviceName, index) => (
                      <View
                        key={`${serviceName}-${index}`}
                        style={styles.serviceTag}
                      >
                        <Text style={styles.serviceTagText}>{serviceName}</Text>
                        <TouchableOpacity
                          onPress={() => removeServiceByName(serviceName)}
                          style={styles.serviceTagClose}
                        >
                          <Text style={styles.serviceTagCloseText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text variant="bodySmall" style={styles.placeholderText}>
                    No services selected
                  </Text>
                )}
                <AppButton
                  mode="outlined"
                  onPress={() => setShowServicesModal(true)}
                  style={styles.selectServicesButton}
                  title="Select Services"
                />
              </View>
            </View>
          </Card.Content>
        </Card>
      </KeyboardAwareScrollView>

      {/* Floating Save Button */}
      <View style={styles.floatingButtonContainer}>
        <AppButton
          mode="contained"
          onPress={handleSubmit}
          loading={isCreating}
          disabled={!isFormValid || isCreating}
          fullWidth
          style={styles.saveButton}
          title={isCreating ? 'Creating Lead...' : 'Save Lead'}
        />
      </View>

      {/* State Selector Modal */}
      <StateSelector
        visible={showStateModal}
        onDismiss={() => setShowStateModal(false)}
        onSelect={(state) => {
          updateField('state', state);
          validateField('state');
        }}
        currentState={formData.state}
      />

      {/* Services Selector Modal */}
      <ServicesSelector
        visible={showServicesModal}
        onDismiss={() => setShowServicesModal(false)}
        selectedServices={formData.services || []}
        onToggleService={toggleService}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    opacity: 0.7,
  },
  formCard: {
    margin: 16,
    marginTop: 8,
  },
  input: {
    marginBottom: 16,
  },
  fieldLabel: {
    marginBottom: 8,
    fontWeight: '500',
  },
  servicesContainer: {
    minHeight: 60,
  },
  selectedServices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  serviceTag: {
    flexDirection: 'row', // ← ADD THIS
    alignItems: 'center',
    backgroundColor: '#e8f4fd',
    borderColor: '#2196F3',
    borderWidth: 1,
    borderRadius: 20,
    paddingLeft: 12, // ← CHANGE from paddingHorizontal
    paddingRight: 4,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  serviceTagText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
    // flex: 1,
  },
  placeholderText: {
    opacity: 0.6,
    marginBottom: 12,
  },
  selectServicesButton: {
    alignSelf: 'flex-start',
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saveButton: {
    borderRadius: 25,
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    padding: 16,
    paddingBottom: 8,
    fontWeight: 'bold',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  stateItem: {
    paddingVertical: 8,
  },
  selectedStateItem: {
    backgroundColor: '#e3f2fd',
  },
  selectedStateText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  serviceItem: {
    paddingVertical: 4,
  },
  modalButtonContainer: {
    padding: 16,
    paddingTop: 8,
  },
  modalDoneButton: {
    borderRadius: 8,
    // minHeight: 36,
    // paddingVertical: 8,
    // paddingHorizontal: 16,
  },
  loadingText: {
    textAlign: 'center',
    padding: 20,
    color: '#666',
  },
  errorText: {
    textAlign: 'center',
    padding: 20,
    color: '#F44336',
  },
  checkMark: {
    color: '#2196F3',
    fontSize: 18,
    fontWeight: 'bold',
  },
  serviceTagClose: {
    marginLeft: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTagCloseText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 16,
  },
});

export default AddLeadScreen;
