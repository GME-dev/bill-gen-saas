-- Function to generate the next motor/chassis number for a bike model
CREATE OR REPLACE FUNCTION generate_next_vehicle_number(
    p_model_name TEXT,
    p_number_type TEXT -- 'motor' or 'chassis'
) RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_last_number INTEGER;
    v_next_number INTEGER;
BEGIN
    -- Get the appropriate prefix
    SELECT 
        CASE 
            WHEN p_number_type = 'motor' THEN motor_number_prefix
            ELSE chassis_number_prefix
        END 
    INTO v_prefix
    FROM bike_models 
    WHERE name = p_model_name;

    -- Get the last used number for this prefix
    SELECT COALESCE(MAX(
        CASE 
            WHEN p_number_type = 'motor' THEN 
                NULLIF(regexp_replace(motor_number, v_prefix, ''), '')::INTEGER
            ELSE 
                NULLIF(regexp_replace(chassis_number, v_prefix, ''), '')::INTEGER
        END
    ), 0)
    INTO v_last_number
    FROM bills 
    WHERE model_name = p_model_name;

    v_next_number := v_last_number + 1;

    -- Return the new number with leading zeros
    RETURN v_prefix || LPAD(v_next_number::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to calculate total amount and validate bill data
CREATE OR REPLACE FUNCTION calculate_bill_amounts(
    p_bill_type bill_type,
    p_model_name TEXT,
    p_bike_price DECIMAL,
    p_down_payment DECIMAL DEFAULT NULL,
    p_advance_amount DECIMAL DEFAULT NULL
) RETURNS TABLE (
    rmv_charge DECIMAL,
    total_amount DECIMAL,
    balance_amount DECIMAL
) AS $$
DECLARE
    v_is_ebicycle BOOLEAN;
BEGIN
    -- Get bike type
    SELECT is_ebicycle INTO v_is_ebicycle
    FROM bike_models WHERE name = p_model_name;

    -- Calculate RMV charge
    rmv_charge := CASE
        WHEN v_is_ebicycle THEN 0
        WHEN p_bill_type IN ('LEASE', 'ADVANCE_LEASE') THEN 13500
        ELSE 13000
    END;

    -- Calculate total amount
    total_amount := CASE
        WHEN p_bill_type = 'LEASE' THEN p_down_payment
        WHEN p_bill_type = 'ADVANCE_LEASE' THEN p_down_payment
        ELSE p_bike_price + rmv_charge
    END;

    -- Calculate balance
    balance_amount := CASE
        WHEN p_bill_type IN ('ADVANCE_CASH', 'ADVANCE_LEASE') THEN
            CASE
                WHEN p_bill_type = 'ADVANCE_LEASE' THEN p_down_payment - COALESCE(p_advance_amount, 0)
                ELSE p_bike_price + rmv_charge - COALESCE(p_advance_amount, 0)
            END
        ELSE NULL
    END;

    -- Validate amounts
    IF p_bill_type IN ('LEASE', 'ADVANCE_LEASE') AND (p_down_payment IS NULL OR p_down_payment <= 0) THEN
        RAISE EXCEPTION 'Down payment is required for lease bills';
    END IF;

    IF p_bill_type IN ('ADVANCE_CASH', 'ADVANCE_LEASE') AND (p_advance_amount IS NULL OR p_advance_amount <= 0) THEN
        RAISE EXCEPTION 'Advance amount is required for advance payment bills';
    END IF;

    IF p_bill_type IN ('ADVANCE_LEASE') AND p_advance_amount > p_down_payment THEN
        RAISE EXCEPTION 'Advance amount cannot be greater than down payment';
    END IF;

    IF p_bill_type IN ('ADVANCE_CASH') AND p_advance_amount > (p_bike_price + rmv_charge) THEN
        RAISE EXCEPTION 'Advance amount cannot be greater than total amount';
    END IF;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql; 