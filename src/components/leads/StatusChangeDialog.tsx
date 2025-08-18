/**
 * StatusChangeDialog Component (D-SCR-005)
 * Modal dialog for changing lead status with validation
 */

import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
} from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Dimensions,
  ScrollView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Button,
  TextInput,
  Card,
  Chip,
  useTheme,
  Portal,
  Surface,
  IconButton,
  HelperText,
} from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import DatePicker from 'react-native-date-picker';

import { useGetQuotationsByLeadIdQuery } from '../../store/api/leadApi';
import {
  validateStatusChange,
  getAllowedNextStatuses,
  getStatusRequirements,
} from '../../validation/statusValidation';
import { StatusChangeDraft } from '../../types/lead';
import type { LeadStatus } from '../../constants/leadStatus';

const { height: screenHeight } = Dimensions.get('window');

interface StatusChangeFormData {
  newStatus: string;
  remarks: string;
  nextFollowUpDate?: Date;
  quotationRef?: string;
  tokenNumber?: string;
}

interface StatusChangeDialogProps {
  leadId: string;
  currentStatus: string;
  onStatusChange: (data: StatusChangeDraft) => Promise<void>;
}

export interface StatusChangeDialogRef {
  open: () => void;
  close: () => void;
}

const StatusChangeDialog = forwardRef<
  StatusChangeDialogRef,
  StatusChangeDialogProps
>(({ leadId, currentStatus, onStatusChange }, ref) => {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Temporary fix - disable quotations query
  // const quotations: any[] = [];
  // const quotationsLoading = false;
  // const quotationsError = null;
  // const refetchQuotations = () => {};

  // Fetch quotations for the lead
  const {
    data: quotations = [],
    isLoading: quotationsLoading,
    error: quotationsError,
  } = useGetQuotationsByLeadIdQuery(
    { leadId, offset: 0, limit: 25 },
    {
      skip: !visible, // Only fetch when dialog is visible
      refetchOnMountOrArgChange: true, // Refetch when args change
    }
  );

  // Form setup
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm<StatusChangeFormData>({
    mode: 'onChange',
    defaultValues: {
      newStatus: '',
      remarks: '',
      nextFollowUpDate: undefined,
      quotationRef: '',
      tokenNumber: '',
    },
  });

  const watchedStatus = watch('newStatus');
  const watchedRemarks = watch('remarks');
  const watchedFollowUpDate = watch('nextFollowUpDate');
  const watchedQuotationRef = watch('quotationRef');
  const watchedTokenNumber = watch('tokenNumber');

  // Get allowed next statuses
  const allowedStatuses = getAllowedNextStatuses(currentStatus);

  // Check if Won status should be available
  const isWonAllowed = allowedStatuses.includes('Won' as LeadStatus);
  const hasQuotations = quotations.length > 0;
  const showWonOption = isWonAllowed && hasQuotations;

  // Filter statuses based on quotation availability
  const availableStatuses = allowedStatuses.filter((status) => {
    if (status === 'Won' && !hasQuotations) {
      return false;
    }
    return true;
  });

  // Real-time validation
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors?: Record<string, string>;
  }>({ valid: false });

  useEffect(() => {
    if (watchedStatus && watchedRemarks) {
      const draft: StatusChangeDraft = {
        currentStatus,
        newStatus: watchedStatus,
        remarks: watchedRemarks,
        nextFollowUpDate: watchedFollowUpDate?.toISOString(),
        quotationRef: watchedQuotationRef,
        tokenNumber: watchedTokenNumber,
      };

      const result = validateStatusChange(draft);
      setValidationResult(result);
    }
  }, [
    currentStatus,
    watchedStatus,
    watchedRemarks,
    watchedFollowUpDate,
    watchedQuotationRef,
    watchedTokenNumber,
  ]);

  useImperativeHandle(ref, () => ({
    open: () => {
      console.log('📱 Opening status change dialog for lead:', leadId);
      setVisible(true);
      // Query will automatically start due to skip: !visible
    },
    close: () => {
      console.log('📱 Closing status change dialog');
      setVisible(false);
      reset();
    },
  }));

  // Handle form submission
  const onSubmit = async (data: StatusChangeFormData) => {
    setLoading(true);
    try {
      const draft: StatusChangeDraft = {
        currentStatus,
        newStatus: data.newStatus,
        remarks: data.remarks,
        nextFollowUpDate: data.nextFollowUpDate?.toISOString(),
        quotationRef: data.quotationRef,
        tokenNumber: data.tokenNumber,
      };

      await onStatusChange(draft);
      setVisible(false);
      reset();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to update status'
      );
    } finally {
      setLoading(false);
    }
  };

  // Close dialog
  const handleClose = () => {
    setVisible(false);
    reset();
  };

  // Check if specific fields are required
  const requiresFollowUp = getStatusRequirements(watchedStatus).some((req) =>
    req.includes('Follow-up date required')
  );
  const requiresQuotationRef = getStatusRequirements(watchedStatus).some(
    (req) => req.includes('Quotation reference required')
  );
  const requiresTokenNumber = getStatusRequirements(watchedStatus).some((req) =>
    req.includes('Token number required')
  );

  // Debug logging - ADD THIS
  console.log('🔍 Dialog Debug Info:', {
    visible,
    currentStatus,
    allowedStatuses,
    quotationsLoading,
    quotationsCount: quotations?.length || 0,
    watchedStatus,
    watchedRemarks,
  });

  // Also add this to see if sections are being rendered
  const debugSections = {
    showCurrentStatus: true,
    showNewStatus: allowedStatuses.length > 0,
    showQuotationRef: requiresQuotationRef,
    showTokenNumber: requiresTokenNumber,
    showFollowUp: requiresFollowUp,
    showRemarks: true,
  };
  console.log('📋 Dialog Sections:', debugSections);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleClose}
        // contentContainerStyle={[
        //   styles.modalContainer,
        //   { backgroundColor: theme.colors.background },
        // ]}
        testID="status-change-dialog"
      >
        <View style={styles.modalContainer}>
          <Surface
            style={[
              styles.dialogSurface,
              { backgroundColor: theme.colors.background },
            ]}
            elevation={4}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text variant="headlineSmall" style={styles.title}>
                Change Lead Status
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                testID="close-dialog-button"
                style={styles.closeButton}
                activeOpacity={0.7}
                accessibilityLabel="Close Dialog"
                accessibilityRole="button"
                accessibilityHint="Closes the status change dialog"
              >
                <Text
                  style={[
                    styles.closeButtonText,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.content}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Current Status */}
              <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Current Status
                </Text>
                <View style={styles.currentStatusContainer}>
                  <Text style={styles.currentStatusText}>{currentStatus}</Text>
                </View>
              </View>

              {/* New Status Selection */}
              <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  New Status *
                </Text>
                <Controller
                  name="newStatus"
                  control={control}
                  rules={{ required: 'Please select a new status' }}
                  render={({ field: { onChange, value } }) => (
                    <View>
                      <View style={styles.statusOptions}>
                        {availableStatuses.map((status) => (
                          <TouchableOpacity
                            key={status}
                            onPress={() => onChange(status)}
                            style={[
                              styles.statusOption,
                              value === status && styles.statusOptionSelected,
                            ]}
                            testID={`status-option-${status
                              .replace(/\s+/g, '-')
                              .toLowerCase()}`}
                          >
                            <Text
                              style={[
                                styles.statusOptionText,
                                value === status &&
                                  styles.statusOptionTextSelected,
                              ]}
                            >
                              {status}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {errors.newStatus && (
                        <Text style={styles.errorText}>
                          {errors.newStatus.message}
                        </Text>
                      )}
                    </View>
                  )}
                />
              </View>

              {requiresQuotationRef && (
                <View style={styles.section}>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Quotation Reference *
                  </Text>
                  <Controller
                    name="quotationRef"
                    control={control}
                    rules={{
                      required: requiresQuotationRef
                        ? 'Please select a quotation'
                        : false,
                    }}
                    render={({ field: { onChange, value } }) => (
                      <View>
                        <View style={styles.quotationOptions}>
                          {quotations.map((quotation) => (
                            <TouchableOpacity
                              key={quotation.quotationId}
                              onPress={() => onChange(quotation.quotationId)}
                              style={[
                                styles.quotationOption,
                                value === quotation.quotationId &&
                                  styles.quotationOptionSelected,
                              ]}
                              testID={`quotation-option-${quotation.quotationId}`}
                            >
                              <Text
                                style={[
                                  styles.quotationOptionText,
                                  value === quotation.quotationId &&
                                    styles.quotationOptionTextSelected,
                                ]}
                              >
                                {quotation.quotationId} - ₹
                                {quotation.totalCost.toLocaleString()}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                  />
                </View>
              )}

              {/* Token Number (for Under Execution/Executed) */}
              {requiresTokenNumber && (
                <View style={styles.section}>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Token Number *
                  </Text>
                  <Controller
                    name="tokenNumber"
                    control={control}
                    rules={{
                      required: requiresTokenNumber
                        ? 'Token number is required'
                        : false,
                    }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View>
                        <TextInput
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="e.g., TKN-5001"
                          style={styles.textInput}
                          testID="token-number-input"
                          accessibilityLabel="Token Number Input"
                        />
                        {errors.tokenNumber && (
                          <HelperText type="error" visible={true}>
                            {errors.tokenNumber.message}
                          </HelperText>
                        )}
                        {validationResult.errors?.tokenNumber && (
                          <HelperText type="error" visible={true}>
                            {validationResult.errors.tokenNumber}
                          </HelperText>
                        )}
                      </View>
                    )}
                  />
                </View>
              )}

              {/* Follow-up Date */}
              {requiresFollowUp && (
                <View style={styles.section}>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Follow-up Date *
                  </Text>
                  <Controller
                    name="nextFollowUpDate"
                    control={control}
                    rules={{
                      required: requiresFollowUp
                        ? 'Follow-up date is required'
                        : false,
                    }}
                    render={({ field: { onChange, value } }) => (
                      <View>
                        <Button
                          mode="outlined"
                          onPress={() => setShowDatePicker(true)}
                          style={styles.dateButton}
                          contentStyle={styles.dateButtonContent}
                          testID="follow-up-date-button"
                        >
                          {value
                            ? value.toLocaleDateString()
                            : 'Select Follow-up Date'}
                        </Button>
                        {errors.nextFollowUpDate && (
                          <HelperText type="error" visible={true}>
                            {errors.nextFollowUpDate.message}
                          </HelperText>
                        )}
                        {validationResult.errors?.nextFollowUpDate && (
                          <HelperText type="error" visible={true}>
                            {validationResult.errors.nextFollowUpDate}
                          </HelperText>
                        )}

                        <DatePicker
                          modal
                          open={showDatePicker}
                          date={value || new Date()}
                          mode="date"
                          minimumDate={new Date()}
                          maximumDate={
                            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                          }
                          onConfirm={(date) => {
                            setShowDatePicker(false);
                            onChange(date);
                          }}
                          onCancel={() => {
                            setShowDatePicker(false);
                          }}
                          testID="follow-up-date-picker"
                        />
                      </View>
                    )}
                  />
                </View>
              )}

              {/* Remarks */}
              <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Remarks *
                </Text>
                <Controller
                  name="remarks"
                  control={control}
                  rules={{
                    required: 'Remarks are required',
                    minLength: {
                      value: 10,
                      message: 'Remarks must be at least 10 characters',
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View>
                      <TextInput
                        mode="outlined"
                        multiline
                        numberOfLines={4}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Add remarks about this status change..."
                        style={styles.remarksInput}
                        testID="remarks-input"
                        accessibilityLabel="Remarks Input"
                      />
                      <HelperText type="info" visible={true}>
                        {value?.length || 0}/10 characters minimum
                      </HelperText>
                      {errors.remarks && (
                        <HelperText type="error" visible={true}>
                          {errors.remarks.message}
                        </HelperText>
                      )}
                      {validationResult.errors?.remarks && (
                        <HelperText type="error" visible={true}>
                          {validationResult.errors.remarks}
                        </HelperText>
                      )}
                    </View>
                  )}
                />
              </View>

              {/* Validation Errors */}
              {validationResult.errors?.transition && (
                <Card style={styles.errorCard}>
                  <Card.Content>
                    <Text
                      variant="bodyMedium"
                      style={{ color: theme.colors.error }}
                    >
                      ❌ {validationResult.errors.transition}
                    </Text>
                  </Card.Content>
                </Card>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <Button
                mode="outlined"
                onPress={handleClose}
                style={styles.cancelButton}
                testID="cancel-button"
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSubmit(onSubmit)}
                loading={loading}
                disabled={!validationResult.valid || loading}
                style={styles.saveButton}
                testID="save-button"
              >
                Save
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>
    </Portal>
  );
});

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  dialogSurface: {
    height: screenHeight * 0.8, // 80% of screen height
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontWeight: '600',
  },
  //   content: {
  //     flex: 1,
  //     paddingHorizontal: 16,
  //   },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: '500',
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    marginBottom: 8,
  },
  quotationOptions: {
    gap: 8,
  },
  quotationOption: {
    marginBottom: 8,
  },
  textInput: {
    marginBottom: 4,
  },
  remarksInput: {
    marginBottom: 4,
  },
  dateButton: {
    marginBottom: 4,
  },
  dateButtonContent: {
    paddingVertical: 8,
  },
  warningCard: {
    marginTop: 8,
    backgroundColor: '#FFF3E0',
  },
  loadingCard: {
    marginTop: 8,
    backgroundColor: '#F5F5F5',
  },
  errorCard: {
    marginTop: 8,
    backgroundColor: '#FFEBEE',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    minHeight: 400, // Add minimum height
  },
  currentStatusContainer: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  currentStatusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 8,
  },
  statusOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  statusOptionTextSelected: {
    color: '#FFFFFF',
  },
  quotationOptions: {
    gap: 8,
  },
  quotationOption: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 8,
  },
  quotationOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  quotationOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  quotationOptionTextSelected: {
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
});

StatusChangeDialog.displayName = 'StatusChangeDialog';

export default StatusChangeDialog;
