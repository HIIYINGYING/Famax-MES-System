-- Update: new stock-triggered procurement requests now start as
-- PENDING (SCM reviews before deciding PREPARED vs UNDER PROCUREMENT),
-- matching the manual request flow. Run after procurement_status_update.sql.

create or replace function fn_auto_create_procurement_request()
returns trigger
language plpgsql
security definer
as $$
declare
    reorder_qty numeric;
begin
    if new.status not in ('LOW_STOCK', 'OUT_OF_STOCK') then
        return new;
    end if;

    if exists (
        select 1 from procurement_requests
        where inventory_item_id = new.id
        and status in ('PENDING', 'PREPARED', 'IN_PROGRESS')
    ) then
        return new;
    end if;

    reorder_qty := case when new.stock_balance <= 0 then 10 else 20 - new.stock_balance end;

    insert into procurement_requests (
        inventory_item_id, request_date, number_available, number_requested,
        status, part_no, part_name, remarks, supplier_partner_id
    )
    values (
        new.id, current_date, new.stock_balance, reorder_qty,
        'PENDING', null, new.item_name,
        'Auto-generated: stock fell to ' || new.status,
        new.supplier_partner_id
    );

    return new;
end;
$$;