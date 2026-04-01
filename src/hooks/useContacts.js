import { useState, useEffect, useCallback } from 'react'
import { listContacts } from '../services/api'

export function useContacts(destinationCountry = null) {
  const [contacts, setContacts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listContacts(destinationCountry)
      setContacts(data.contacts ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [destinationCountry])

  useEffect(() => { load() }, [load])

  return { contacts, loading, error, reload: load }
}
