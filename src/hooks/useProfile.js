/**
 * useProfile.js — Hook para gestión del perfil de usuario.
 *
 * Endpoints:
 *   GET    /api/v1/user/profile      → fetchProfile()
 *   PATCH  /api/v1/user/profile      → updateProfile(data)
 *   POST   /api/v1/user/change-password → changePassword(data)
 *   DELETE /api/v1/user/fcm-token    → removeDevice(token)
 */

import { useState, useCallback } from 'react'
import { request } from '../services/api'
import { useAuth } from '../context/AuthContext'

export function useProfile() {
  const { updateUser } = useAuth()

  const [profile,  setProfile]  = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [saving,   setSaving]   = useState(false)

  // ── fetchProfile ───────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await request('/user/profile')
      setProfile(data.user ?? data)
    } catch (err) {
      setError(err.message ?? 'Error al cargar el perfil')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── updateProfile ──────────────────────────────────────────────────────────
  /**
   * PATCH /user/profile
   * Actualiza localmente y sincroniza el AuthContext para que el header
   * refleje el cambio inmediatamente sin re-fetchear.
   */
  const updateProfile = useCallback(async (data) => {
    setSaving(true)
    setError(null)
    try {
      const res = await request('/user/profile', {
        method: 'PATCH',
        body:   JSON.stringify(data),
      })
      const updated = res.user ?? res
      // Actualizar estado local
      setProfile(prev => ({ ...prev, ...updated }))
      // Sincronizar AuthContext (avatar, nombre en header, etc.)
      updateUser(updated)
      return updated
    } catch (err) {
      setError(err.message ?? 'Error al guardar el perfil')
      throw err
    } finally {
      setSaving(false)
    }
  }, [updateUser])

  // ── changePassword ─────────────────────────────────────────────────────────
  const changePassword = useCallback(async (data) => {
    setSaving(true)
    setError(null)
    try {
      await request('/user/change-password', {
        method: 'POST',
        body:   JSON.stringify(data),
      })
    } catch (err) {
      setError(err.message ?? 'Error al cambiar la contraseña')
      throw err
    } finally {
      setSaving(false)
    }
  }, [])

  // ── removeDevice ───────────────────────────────────────────────────────────
  const removeDevice = useCallback(async (token) => {
    setSaving(true)
    setError(null)
    try {
      await request('/user/fcm-token', {
        method: 'DELETE',
        body:   JSON.stringify({ token }),
      })
      // Limpiar token del storage local
      localStorage.removeItem('alyto_fcm_token')
    } catch (err) {
      setError(err.message ?? 'Error al desvincular el dispositivo')
      throw err
    } finally {
      setSaving(false)
    }
  }, [])

  return {
    profile,
    loading,
    error,
    saving,
    fetchProfile,
    updateProfile,
    changePassword,
    removeDevice,
  }
}
