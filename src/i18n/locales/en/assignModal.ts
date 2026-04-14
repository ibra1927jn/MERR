import type { TranslationDict } from '../../types';

const assignModal: TranslationDict = {
    'assignModal.title': 'Row {row}',
    'assignModal.subtitle': '{occupiedCount}/{totalRows} rows assigned',
    'assignModal.team_leader': 'Team Leader',
    'assignModal.bucket_runner': 'Bucket Runner',
    'assignModal.side': 'Side',
    'assignModal.side.north': 'North',
    'assignModal.side.south': 'South',
    'assignModal.select_leader': 'Select leader...',
    'assignModal.select_runner': 'Select runner (optional)...',
    'assignModal.confirm': 'Confirm Assignment',
    'assignModal.confirm_n_rows': 'Assign {n} Rows',
    'assignModal.assigning': 'Assigning...',
    'assignModal.people_on_row_one': '{n} person on row',
    'assignModal.people_on_row_other': '{n} people on row',
    'assignModal.teams_on_row': '{n} team on row {row}',
    'assignModal.teams_on_row_plural': '{n} teams on row {row}',
    // Row selection grid
    'assignModal.selected_one': '{n} row selected',
    'assignModal.selected_other': '{n} rows selected',
    'assignModal.block_rows': '{blockName} — Rows',
};

export default assignModal;
