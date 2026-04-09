/**
 * useInactivityTimeout.js — Cierre de sesión por inactividad.
 *
 * Muestra modal de advertencia tras TIMEOUT_MS de inactividad.
 * Si el usuario no responde en COUNTDOWN_SECS, cierra la sesión.
 *
 * Configurable vía VITE_INACTIVITY_TIMEOUT_MS (default: 30 min).
 */

import { useState, useEffect, useRef, useCallback } from 'react'

const TIMEOUT_MS     = parseInt(import.meta.env.VITE_INACTIVITY_TIMEOUT_MS || '1800000', 10)
const COUNTDOWN_SECS = 60
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll']

export function useInactivityTimeout({ onLogout }) {
  const [showModal, setShowModal]   = useState(false)
  const [countdown, setCountdown]   = useState(COUNTDOWN_SECS)
  const timerRef     = useRef(null)
  const countdownRef = useRef(null)

  // ── Reset inactivity timer ──────────────────────────────────────────────
  const resetTimer = useCallback(() => {
    if (showModal) return // Don't reset while modal is showing
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setShowModal(true)
      setCountdown(COUNTDOWN_SECS)
    }, TIMEOUT_MS)
  }, [showModal])

  // ── Activity listeners ──────────────────────────────────────────────────
  useEffect(() => {
    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, resetTimer, { passive: true }))
    resetTimer()
    return () => {
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, resetTimer))
      clearTimeout(timerRef.current)
    }
  }, [resetTimer])

  // ── Countdown when modal is shown ───────────────────────────────────────
  useEffect(() => {
    if (!showModal) {
      clearInterval(countdownRef.current)
      return
    }
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current)
          setShowModal(false)
          onLogout()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(countdownRef.current)
  }, [showModal, onLogout])

  // ── User actions ────────────────────────────────────────────────────────
  const continueSession = useCallback(() => {
    setShowModal(false)
    setCountdown(COUNTDOWN_SECS)
    // Reset timer will be triggered by next activity event
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setShowModal(true)
      setCountdown(COUNTDOWN_SECS)
    }, TIMEOUT_MS)
  }, [])

  const endSession = useCallback(() => {
    setShowModal(false)
    clearTimeout(timerRef.current)
    clearInterval(countdownRef.current)
    onLogout()
  }, [onLogout])

  return { showModal, countdown, continueSession, endSession }
}
