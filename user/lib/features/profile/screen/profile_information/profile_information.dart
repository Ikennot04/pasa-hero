import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../../../../core/themes/validation_theme.dart';
import '../../../auth/auth_bloc/auth_bloc_bloc.dart';
import '../../../auth/auth_bloc/auth_bloc_event.dart';

class ProfileInformationScreen extends StatefulWidget {
  const ProfileInformationScreen({super.key});

  @override
  State<ProfileInformationScreen> createState() => _ProfileInformationScreenState();
}

class _ProfileInformationScreenState extends State<ProfileInformationScreen> {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  
  final TextEditingController _firstNameController = TextEditingController();
  final TextEditingController _lastNameController = TextEditingController();
  
  bool _isEditMode = false;
  bool _isLoading = true;
  bool _isSaving = false;
  String? _errorMessage;
  String? _originalFirstName;
  String? _originalLastName;

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    super.dispose();
  }

  Future<void> _loadUserData() async {
    try {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });

      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('No user is currently signed in.');
      }

      // Fetch user data from Firestore
      final userDoc = await _firestore.collection('users').doc(user.uid).get();
      
      if (userDoc.exists) {
        final userData = userDoc.data() as Map<String, dynamic>;
        final firstName = userData['firstName'] as String? ?? '';
        final lastName = userData['lastName'] as String? ?? '';
        
        setState(() {
          _firstNameController.text = firstName;
          _lastNameController.text = lastName;
          _originalFirstName = firstName;
          _originalLastName = lastName;
          _isLoading = false;
        });
      } else {
        // If Firestore document doesn't exist, try to get from display name
        final displayName = user.displayName ?? '';
        final nameParts = displayName.split(' ');
        final firstName = nameParts.isNotEmpty ? nameParts[0] : '';
        final lastName = nameParts.length > 1 ? nameParts.sublist(1).join(' ') : '';
        
        setState(() {
          _firstNameController.text = firstName;
          _lastNameController.text = lastName;
          _originalFirstName = firstName;
          _originalLastName = lastName;
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load user data: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  Future<void> _saveUserData() async {
    try {
      setState(() {
        _isSaving = true;
        _errorMessage = null;
      });

      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('No user is currently signed in.');
      }

      final firstName = _firstNameController.text.trim();
      final lastName = _lastNameController.text.trim();

      // Validate inputs
      if (firstName.isEmpty) {
        throw Exception('First name cannot be empty');
      }
      if (lastName.isEmpty) {
        throw Exception('Last name cannot be empty');
      }

      // Get server URL
      String serverUrl = const String.fromEnvironment(
        'SERVER_URL',
        defaultValue: 'http://localhost:3000',
      );

      if (kIsWeb && serverUrl == 'http://localhost:3000') {
        serverUrl = 'http://localhost:3000';
      }

      // Update Firestore via API
      final response = await http.put(
        Uri.parse('$serverUrl/api/users/firebase/${user.uid}'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'firstName': firstName,
          'lastName': lastName,
        }),
      ).timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          throw Exception('Request timed out. Please try again.');
        },
      );

      if (response.statusCode == 200) {
        // Update Firestore directly as well
        await _firestore.collection('users').doc(user.uid).update({
          'firstName': firstName,
          'lastName': lastName,
          'updatedAt': FieldValue.serverTimestamp(),
        });

        // Update Firebase Auth display name
        await user.updateDisplayName('$firstName $lastName');
        await user.reload();

        // Refresh AuthBloc state to update user info throughout the app
        if (mounted) {
          try {
            final authBloc = BlocProvider.of<AuthBlocBloc>(context, listen: false);
            authBloc.add(CheckAuthStateEvent());
          } catch (e) {
            // AuthBloc might not be available in context, that's okay
            // The ProfileScreen will refresh when navigated back to
            print('AuthBloc not found in context: $e');
          }
        }

        setState(() {
          _isEditMode = false;
          _isSaving = false;
          _originalFirstName = firstName;
          _originalLastName = lastName;
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Profile updated successfully'),
              backgroundColor: ValidationTheme.successGreen,
            ),
          );
        }
      } else {
        final responseData = jsonDecode(response.body) as Map<String, dynamic>;
        throw Exception(responseData['error'] ?? 'Failed to update profile');
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
        _isSaving = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_errorMessage ?? 'Failed to update profile'),
            backgroundColor: ValidationTheme.errorRed,
          ),
        );
      }
    }
  }

  void _toggleEditMode() {
    if (_isEditMode) {
      // Cancel edit - restore original values
      _firstNameController.text = _originalFirstName ?? '';
      _lastNameController.text = _originalLastName ?? '';
    }
    setState(() {
      _isEditMode = !_isEditMode;
      _errorMessage = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: ValidationTheme.gradientDecoration,
        child: SafeArea(
          child: _isLoading
              ? const Center(
                  child: CircularProgressIndicator(
                    color: ValidationTheme.primaryBlue,
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 24.0),
                  child: Column(
                    children: [
                      const SizedBox(height: 16),
                      
                      // Header Section with Back Button and Title
                      Container(
                        padding: const EdgeInsets.symmetric(vertical: 16.0),
                        child: Stack(
                          children: [
                            // Back button
                            Align(
                              alignment: Alignment.centerLeft,
                              child: IconButton(
                                onPressed: () {
                                  if (_isEditMode) {
                                    // Cancel edit mode
                                    _toggleEditMode();
                                  } else {
                                    Navigator.of(context).pop();
                                  }
                                },
                                icon: Container(
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: ValidationTheme.backgroundWhite,
                                    shape: BoxShape.circle,
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withOpacity(0.1),
                                        blurRadius: 4,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: const Icon(
                                    Icons.arrow_back,
                                    color: ValidationTheme.textPrimary,
                                    size: 20,
                                  ),
                                ),
                              ),
                            ),
                            // Title
                            Center(
                              child: Text(
                                'Profile Information',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: ValidationTheme.darkBlue,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      
                      const SizedBox(height: 32),
                      
                      // Profile Picture Section
                      Stack(
                        children: [
                          // Profile Picture
                          Container(
                            width: 120,
                            height: 120,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.grey[300],
                            ),
                            child: Icon(
                              Icons.person,
                              size: 60,
                              color: Colors.grey[600],
                            ),
                          ),
                          // Upload Button Overlay
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: ValidationTheme.primaryBlue,
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: ValidationTheme.backgroundWhite,
                                  width: 3,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.2),
                                    blurRadius: 4,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: IconButton(
                                onPressed: () {
                                  // TODO: Implement image upload functionality
                                },
                                icon: const Icon(
                                  Icons.upload,
                                  color: ValidationTheme.textLight,
                                  size: 20,
                                ),
                                padding: EdgeInsets.zero,
                              ),
                            ),
                          ),
                        ],
                      ),
                      
                      const SizedBox(height: 40),
                      
                      // Error Message
                      if (_errorMessage != null)
                        Container(
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.only(bottom: 16),
                          decoration: BoxDecoration(
                            color: ValidationTheme.errorLight,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: ValidationTheme.errorRed,
                              width: 1,
                            ),
                          ),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.error_outline,
                                color: ValidationTheme.errorRed,
                                size: 20,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _errorMessage!,
                                  style: const TextStyle(
                                    color: ValidationTheme.errorRed,
                                    fontSize: 14,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      
                      // Name Input Fields Section
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // First Name Field
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'First name',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                    color: ValidationTheme.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                TextField(
                                  controller: _firstNameController,
                                  enabled: _isEditMode && !_isSaving,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    color: ValidationTheme.textPrimary,
                                  ),
                                  decoration: InputDecoration(
                                    filled: true,
                                    fillColor: ValidationTheme.backgroundWhite,
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: BorderSide.none,
                                    ),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: BorderSide.none,
                                    ),
                                    disabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: BorderSide.none,
                                    ),
                                    focusedBorder: _isEditMode
                                        ? OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(12),
                                            borderSide: const BorderSide(
                                              color: ValidationTheme.primaryBlue,
                                              width: 2,
                                            ),
                                          )
                                        : null,
                                    contentPadding: const EdgeInsets.symmetric(
                                      horizontal: 16,
                                      vertical: 16,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          
                          const SizedBox(width: 16),
                          
                          // Last Name Field
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Last name',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                    color: ValidationTheme.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                TextField(
                                  controller: _lastNameController,
                                  enabled: _isEditMode && !_isSaving,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    color: ValidationTheme.textPrimary,
                                  ),
                                  decoration: InputDecoration(
                                    filled: true,
                                    fillColor: ValidationTheme.backgroundWhite,
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: BorderSide.none,
                                    ),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: BorderSide.none,
                                    ),
                                    disabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: BorderSide.none,
                                    ),
                                    focusedBorder: _isEditMode
                                        ? OutlineInputBorder(
                                            borderRadius: BorderRadius.circular(12),
                                            borderSide: const BorderSide(
                                              color: ValidationTheme.primaryBlue,
                                              width: 2,
                                            ),
                                          )
                                        : null,
                                    contentPadding: const EdgeInsets.symmetric(
                                      horizontal: 16,
                                      vertical: 16,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      
                      const SizedBox(height: 24),
                      
                      // Edit/Save Button
                      Align(
                        alignment: Alignment.centerRight,
                        child: SizedBox(
                          width: 120,
                          height: 48,
                          child: ElevatedButton(
                            onPressed: _isSaving
                                ? null
                                : () {
                                    if (_isEditMode) {
                                      _saveUserData();
                                    } else {
                                      _toggleEditMode();
                                    }
                                  },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: ValidationTheme.primaryBlue,
                              foregroundColor: ValidationTheme.textLight,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              elevation: 0,
                              disabledBackgroundColor: ValidationTheme.primaryBlue.withOpacity(0.6),
                            ),
                            child: _isSaving
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: ValidationTheme.textLight,
                                    ),
                                  )
                                : Text(
                                    _isEditMode ? 'Save' : 'Edit',
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                          ),
                        ),
                      ),
                      
                      const SizedBox(height: 40),
                    ],
                  ),
                ),
        ),
      ),
    );
  }
}
