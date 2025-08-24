import React, { useState, useEffect } from 'react';

const Rating = ({ storeId, onRatingUpdate }) => {
  const [userRating, setUserRating] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUserRating();
  }, [storeId]);

  const fetchUserRating = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/ratings?storeId=${storeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.rating) {
          setUserRating(data.rating);
        }
      }
    } catch (error) {
      console.error('Error fetching user rating:', error);
    }
  };

  const handleRating = async (rating) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          storeId,
          rating
        })
      });

      const data = await response.json();
      if (response.ok) {
        setUserRating(rating);
        if (onRatingUpdate) onRatingUpdate();
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Error submitting rating');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rating-component">
      <p>Your Rating:</p>
      <div className="stars">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            className={`star ${userRating >= star ? 'active' : ''}`}
            onClick={() => handleRating(star)}
            disabled={loading}
            type="button"
          >
            ⭐
          </button>
        ))}
      </div>
      {userRating > 0 && (
        <p className="current-rating">You rated this store: {userRating} stars</p>
      )}
    </div>
  );
};

export default Rating;